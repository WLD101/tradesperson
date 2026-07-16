"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, Input } from "@tradesperson/ui";
import { ClientApiError, clientApiFetch } from "@/lib/client-api";

type SurveyStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REVIEWED"
  | "APPROVED"
  | "CANCELLED"
  | "SUPERSEDED";

type ComponentType =
  | "RECTANGLE"
  | "TRIANGLE"
  | "CIRCLE"
  | "SEMICIRCLE"
  | "ALCOVE"
  | "COLUMN"
  | "STAIR"
  | "LANDING"
  | "CORRIDOR";

type MeasurementOperation = "ADD" | "DEDUCT";
type SubfloorType =
  | "CONCRETE"
  | "SAND_CEMENT_SCREED"
  | "ANHYDRITE_SCREED"
  | "TIMBER_BOARDS"
  | "PLYWOOD"
  | "CHIPBOARD"
  | "EXISTING_TILE"
  | "EXISTING_RESILIENT"
  | "RAISED_ACCESS"
  | "OTHER"
  | "UNKNOWN";

type MeasurementComponentRecord = {
  id: string;
  type: ComponentType;
  operation: MeasurementOperation;
  dimensions: Record<string, unknown>;
  calculatedArea: string;
  notes: string | null;
};

type SurveyRoomRecord = {
  id: string;
  name: string;
  floorLevel: string | null;
  existingCovering: string | null;
  subfloorType: SubfloorType | null;
  subfloorCondition: string | null;
  underfloorHeating: boolean;
  upliftRequired: boolean;
  wastePercentage: string;
  netArea: string;
  grossArea: string;
  wasteAdjustedArea: string;
  preparationNotes: string | null;
  installationNotes: string | null;
  components: MeasurementComponentRecord[];
};

type SurveyRecord = {
  id: string;
  reference: string;
  purpose: string | null;
  status: SurveyStatus;
  site: { id: string; label: string } | null;
  customer: { id: string; displayName: string } | null;
  rooms: SurveyRoomRecord[];
};

type RoomFormState = {
  name: string;
  floorLevel: string;
  existingCovering: string;
  subfloorType: string;
  subfloorCondition: string;
  underfloorHeating: boolean;
  upliftRequired: boolean;
  wastePercentage: string;
  preparationNotes: string;
  installationNotes: string;
};

type ComponentFormState = {
  type: ComponentType;
  operation: MeasurementOperation;
  notes: string;
  dimensions: Record<string, string>;
};

type ShapeDefinition = {
  label: string;
  fields: Array<{ key: string; label: string }>;
};

const IMMUTABLE_STATES: SurveyStatus[] = [
  "COMPLETED",
  "REVIEWED",
  "APPROVED",
  "SUPERSEDED",
  "CANCELLED",
];

const SHAPE_DEFINITIONS: Record<ComponentType, ShapeDefinition> = {
  RECTANGLE: {
    label: "Rectangle",
    fields: [
      { key: "length", label: "Length (m)" },
      { key: "width", label: "Width (m)" },
    ],
  },
  TRIANGLE: {
    label: "Triangle",
    fields: [
      { key: "base", label: "Base (m)" },
      { key: "height", label: "Height (m)" },
    ],
  },
  CIRCLE: {
    label: "Circle",
    fields: [{ key: "radius", label: "Radius (m)" }],
  },
  SEMICIRCLE: {
    label: "Semicircle",
    fields: [{ key: "radius", label: "Radius (m)" }],
  },
  ALCOVE: {
    label: "Alcove",
    fields: [
      { key: "length", label: "Length (m)" },
      { key: "width", label: "Width (m)" },
    ],
  },
  COLUMN: {
    label: "Column",
    fields: [
      { key: "length", label: "Length (m)" },
      { key: "width", label: "Width (m)" },
    ],
  },
  STAIR: {
    label: "Stair",
    fields: [
      { key: "width", label: "Width (m)" },
      { key: "tread", label: "Tread (m)" },
      { key: "riser", label: "Riser (m)" },
      { key: "count", label: "Step count" },
    ],
  },
  LANDING: {
    label: "Landing",
    fields: [
      { key: "length", label: "Length (m)" },
      { key: "width", label: "Width (m)" },
    ],
  },
  CORRIDOR: {
    label: "Corridor",
    fields: [
      { key: "length", label: "Length (m)" },
      { key: "width", label: "Width (m)" },
    ],
  },
};

const EMPTY_ROOM_FORM: RoomFormState = {
  name: "",
  floorLevel: "",
  existingCovering: "",
  subfloorType: "",
  subfloorCondition: "",
  underfloorHeating: false,
  upliftRequired: false,
  wastePercentage: "0",
  preparationNotes: "",
  installationNotes: "",
};

function emptyComponentForm(type: ComponentType = "RECTANGLE"): ComponentFormState {
  const dimensions: Record<string, string> = {};
  for (const field of SHAPE_DEFINITIONS[type].fields) {
    dimensions[field.key] = "";
  }

  return {
    type,
    operation: "ADD",
    notes: "",
    dimensions,
  };
}

function mapRoomToForm(room: SurveyRoomRecord): RoomFormState {
  return {
    name: room.name,
    floorLevel: room.floorLevel ?? "",
    existingCovering: room.existingCovering ?? "",
    subfloorType: room.subfloorType ?? "",
    subfloorCondition: room.subfloorCondition ?? "",
    underfloorHeating: Boolean(room.underfloorHeating),
    upliftRequired: Boolean(room.upliftRequired),
    wastePercentage: room.wastePercentage ?? "0",
    preparationNotes: room.preparationNotes ?? "",
    installationNotes: room.installationNotes ?? "",
  };
}

function mapComponentToForm(component: MeasurementComponentRecord): ComponentFormState {
  const base = emptyComponentForm(component.type);
  for (const field of SHAPE_DEFINITIONS[component.type].fields) {
    const value = component.dimensions[field.key];
    base.dimensions[field.key] = value == null ? "" : String(value);
  }

  return {
    type: component.type,
    operation: component.operation,
    notes: component.notes ?? "",
    dimensions: base.dimensions,
  };
}

function parseNumber(value: string, label: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }
  return parsed;
}

function formatError(error: unknown) {
  if (error instanceof ClientApiError) {
    if (error.status === 401) {
      return "Your session has expired. Sign in again and retry.";
    }
    if (error.status === 403) {
      return "You do not have permission to change this survey.";
    }
    if (error.status === 404) {
      return "The survey or room could not be found in your current tenant or branch scope.";
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function formatArea(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return "0.00";
  }
  return parsed.toFixed(2);
}

function buildDimensions(formState: ComponentFormState) {
  const definition = SHAPE_DEFINITIONS[formState.type];
  const parsedDimensions: Record<string, number> = {};

  for (const field of definition.fields) {
    parsedDimensions[field.key] = parseNumber(formState.dimensions[field.key] ?? "", field.label);
  }

  return parsedDimensions;
}

function componentSummary(component: MeasurementComponentRecord) {
  const definition = SHAPE_DEFINITIONS[component.type];
  return definition.fields
    .map((field) => `${field.label.replace(" (m)", "")}: ${component.dimensions[field.key]}`)
    .join(", ");
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "blue" | "green";
}) {
  const toneClass =
    tone === "blue"
      ? "border-blue-100 bg-blue-50/70 text-blue-950"
      : tone === "green"
        ? "border-emerald-100 bg-emerald-50/70 text-emerald-950"
        : "text-slate-950";

  return (
    <Card className={`!p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value} m2</p>
    </Card>
  );
}

export default function SurveyMeasurementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [surveyId, setSurveyId] = useState("");
  const [survey, setSurvey] = useState<SurveyRecord | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [roomForm, setRoomForm] = useState<RoomFormState>(EMPTY_ROOM_FORM);
  const [newRoomForm, setNewRoomForm] = useState<RoomFormState>(EMPTY_ROOM_FORM);
  const [componentForm, setComponentForm] = useState<ComponentFormState>(emptyComponentForm());
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [roomMessage, setRoomMessage] = useState("");
  const [componentMessage, setComponentMessage] = useState("");
  const [savingRoom, setSavingRoom] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState(false);
  const [savingComponent, setSavingComponent] = useState(false);
  const [deletingComponentId, setDeletingComponentId] = useState<string | null>(null);

  const isImmutable = survey ? IMMUTABLE_STATES.includes(survey.status) : false;

  async function loadSurvey(id: string, preferredRoomId?: string) {
    setLoading(true);
    setPageError("");

    try {
      const data = await clientApiFetch<SurveyRecord>(`/api/v1/surveys/${id}`);
      setSurvey(data);

      const nextRoomId =
        preferredRoomId && data.rooms.some((room) => room.id === preferredRoomId)
          ? preferredRoomId
          : data.rooms[0]?.id ?? "";

      setSelectedRoomId(nextRoomId);

      const nextRoom = data.rooms.find((room) => room.id === nextRoomId);
      setRoomForm(nextRoom ? mapRoomToForm(nextRoom) : EMPTY_ROOM_FORM);

      if (!nextRoom) {
        setEditingComponentId(null);
        setComponentForm(emptyComponentForm());
      }
    } catch (error) {
      setPageError(formatError(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    params
      .then(({ id }) => {
        if (!active) {
          return;
        }
        setSurveyId(id);
        void loadSurvey(id);
      })
      .catch(() => {
        if (active) {
          setPageError("Unable to resolve the survey identifier.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [params]);

  const selectedRoom = useMemo(
    () => survey?.rooms.find((room) => room.id === selectedRoomId) ?? null,
    [survey, selectedRoomId],
  );

  useEffect(() => {
    if (selectedRoom) {
      setRoomForm(mapRoomToForm(selectedRoom));
      setEditingComponentId(null);
      setComponentForm(emptyComponentForm());
    } else {
      setRoomForm(EMPTY_ROOM_FORM);
      setEditingComponentId(null);
      setComponentForm(emptyComponentForm());
    }
  }, [selectedRoomId, selectedRoom]);

  function updateRoomField<K extends keyof RoomFormState>(key: K, value: RoomFormState[K]) {
    setRoomForm((current) => ({ ...current, [key]: value }));
  }

  function updateNewRoomField<K extends keyof RoomFormState>(key: K, value: RoomFormState[K]) {
    setNewRoomForm((current) => ({ ...current, [key]: value }));
  }

  function setComponentType(type: ComponentType) {
    setComponentForm((current) => {
      const next = emptyComponentForm(type);
      next.operation = current.operation;
      next.notes = current.notes;
      return next;
    });
  }

  function updateComponentDimension(key: string, value: string) {
    setComponentForm((current) => ({
      ...current,
      dimensions: {
        ...current.dimensions,
        [key]: value,
      },
    }));
  }

  function startEditingComponent(component: MeasurementComponentRecord) {
    setEditingComponentId(component.id);
    setComponentForm(mapComponentToForm(component));
    setComponentMessage("");
    setPageError("");
  }

  function resetComponentEditor() {
    setEditingComponentId(null);
    setComponentForm(emptyComponentForm());
  }

  async function handleCreateRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!surveyId) {
      return;
    }

    setCreatingRoom(true);
    setPageError("");
    setRoomMessage("");

    try {
      const createdRoom = await clientApiFetch<SurveyRoomRecord>(`/api/v1/surveys/${surveyId}/rooms`, {
        method: "POST",
        body: JSON.stringify({
          name: newRoomForm.name.trim(),
          floorLevel: newRoomForm.floorLevel.trim(),
          existingCovering: newRoomForm.existingCovering.trim(),
          subfloorType: newRoomForm.subfloorType || undefined,
          subfloorCondition: newRoomForm.subfloorCondition.trim(),
          underfloorHeating: newRoomForm.underfloorHeating,
          upliftRequired: newRoomForm.upliftRequired,
          wastePercentage: Number(newRoomForm.wastePercentage || "0"),
          preparationNotes: newRoomForm.preparationNotes.trim(),
          installationNotes: newRoomForm.installationNotes.trim(),
        }),
      });

      setNewRoomForm(EMPTY_ROOM_FORM);
      setRoomMessage("Room added.");
      await loadSurvey(surveyId, createdRoom.id);
    } catch (error) {
      setPageError(formatError(error));
    } finally {
      setCreatingRoom(false);
    }
  }

  async function handleSaveRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!surveyId || !selectedRoom) {
      return;
    }

    setSavingRoom(true);
    setPageError("");
    setRoomMessage("");

    try {
      await clientApiFetch(`/api/v1/surveys/${surveyId}/rooms/${selectedRoom.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: roomForm.name.trim(),
          floorLevel: roomForm.floorLevel.trim(),
          existingCovering: roomForm.existingCovering.trim(),
          subfloorType: roomForm.subfloorType || undefined,
          subfloorCondition: roomForm.subfloorCondition.trim(),
          underfloorHeating: roomForm.underfloorHeating,
          upliftRequired: roomForm.upliftRequired,
          wastePercentage: Number(roomForm.wastePercentage || "0"),
          preparationNotes: roomForm.preparationNotes.trim(),
          installationNotes: roomForm.installationNotes.trim(),
        }),
      });

      setRoomMessage("Room details and waste settings saved.");
      await loadSurvey(surveyId, selectedRoom.id);
    } catch (error) {
      setPageError(formatError(error));
    } finally {
      setSavingRoom(false);
    }
  }

  async function handleDeleteRoom() {
    if (!surveyId || !selectedRoom) {
      return;
    }

    if (!window.confirm(`Delete room "${selectedRoom.name}" and all of its measurements?`)) {
      return;
    }

    setDeletingRoom(true);
    setPageError("");
    setRoomMessage("");

    try {
      await clientApiFetch(`/api/v1/surveys/${surveyId}/rooms/${selectedRoom.id}`, {
        method: "DELETE",
      });

      setRoomMessage("Room deleted.");
      await loadSurvey(surveyId);
    } catch (error) {
      setPageError(formatError(error));
    } finally {
      setDeletingRoom(false);
    }
  }

  async function handleSaveComponent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!surveyId || !selectedRoom) {
      return;
    }

    setSavingComponent(true);
    setPageError("");
    setComponentMessage("");

    try {
      const payload = {
        type: componentForm.type,
        operation: componentForm.operation,
        notes: componentForm.notes.trim(),
        dimensions: buildDimensions(componentForm),
      };

      if (editingComponentId) {
        await clientApiFetch(
          `/api/v1/surveys/${surveyId}/rooms/${selectedRoom.id}/components/${editingComponentId}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          },
        );
        setComponentMessage("Measurement updated.");
      } else {
        await clientApiFetch(`/api/v1/surveys/${surveyId}/rooms/${selectedRoom.id}/components`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setComponentMessage("Measurement added.");
      }

      resetComponentEditor();
      await loadSurvey(surveyId, selectedRoom.id);
    } catch (error) {
      setPageError(formatError(error));
    } finally {
      setSavingComponent(false);
    }
  }

  async function handleDeleteComponent(componentId: string) {
    if (!surveyId || !selectedRoom) {
      return;
    }

    if (!window.confirm("Delete this measurement component?")) {
      return;
    }

    setDeletingComponentId(componentId);
    setPageError("");
    setComponentMessage("");

    try {
      await clientApiFetch(
        `/api/v1/surveys/${surveyId}/rooms/${selectedRoom.id}/components/${componentId}`,
        {
          method: "DELETE",
        },
      );

      if (editingComponentId === componentId) {
        resetComponentEditor();
      }

      setComponentMessage("Measurement deleted.");
      await loadSurvey(surveyId, selectedRoom.id);
    } catch (error) {
      setPageError(formatError(error));
    } finally {
      setDeletingComponentId(null);
    }
  }

  if (loading) {
    return <div className="p-4 text-sm text-slate-500">Loading measurements...</div>;
  }

  if (!survey) {
    return (
      <div className="space-y-4">
        <Link
          href="/app/crm/surveys"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          Back to Surveys
        </Link>
        <Card>
          <p className="text-sm text-rose-700">{pageError || "The survey could not be loaded."}</p>
        </Card>
      </div>
    );
  }

  const wastePercentage = selectedRoom ? formatArea(selectedRoom.wastePercentage) : "0.00";
  const deductionArea = selectedRoom
    ? selectedRoom.components.reduce((sum, component) => {
        if (component.operation !== "DEDUCT") {
          return sum;
        }
        return sum + Number(component.calculatedArea);
      }, 0)
    : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href={`/app/crm/surveys/${survey.id}`}
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Back to Survey
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">
            Measurements for {survey.reference}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {survey.site?.label ?? "Site unavailable"} - {survey.customer?.displayName ?? "Customer unavailable"}
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800">
          {survey.status}
        </span>
      </div>

      {isImmutable ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This survey is now immutable in the {survey.status} state. You can review measurements, but room and component changes are disabled.
        </div>
      ) : null}

      {pageError ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {pageError}
        </div>
      ) : null}

      {roomMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {roomMessage}
        </div>
      ) : null}

      {componentMessage ? (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
          {componentMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Rooms</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select a room to maintain waste, prep notes, and measurement components.
                </p>
              </div>
              <span className="text-sm text-slate-500">{survey.rooms.length} total</span>
            </div>

            <div className="mt-4 space-y-2">
              {survey.rooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                    room.id === selectedRoomId
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{room.name}</p>
                      <p className={`text-xs ${room.id === selectedRoomId ? "text-slate-200" : "text-slate-500"}`}>
                        {room.floorLevel || "Floor level not set"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatArea(room.wasteAdjustedArea)} m2</p>
                      <p className={`text-xs ${room.id === selectedRoomId ? "text-slate-200" : "text-slate-500"}`}>
                        Waste-adjusted
                      </p>
                    </div>
                  </div>
                </button>
              ))}

              {!survey.rooms.length ? (
                <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                  No rooms have been added yet.
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-slate-950">Add Room</h2>
            <form onSubmit={handleCreateRoom} className="mt-4 space-y-3">
              <Input
                value={newRoomForm.name}
                onChange={(event) => updateNewRoomField("name", event.target.value)}
                placeholder="Lounge"
                required
                disabled={isImmutable}
              />
              <Input
                value={newRoomForm.floorLevel}
                onChange={(event) => updateNewRoomField("floorLevel", event.target.value)}
                placeholder="Ground floor"
                disabled={isImmutable}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={newRoomForm.existingCovering}
                  onChange={(event) => updateNewRoomField("existingCovering", event.target.value)}
                  placeholder="Existing covering"
                  disabled={isImmutable}
                />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={newRoomForm.wastePercentage}
                  onChange={(event) => updateNewRoomField("wastePercentage", event.target.value)}
                  placeholder="Waste %"
                  disabled={isImmutable}
                />
              </div>
              <Button
                type="submit"
                disabled={isImmutable || creatingRoom || !newRoomForm.name.trim()}
                className="w-full"
              >
                {creatingRoom ? "Adding room..." : "Add room"}
              </Button>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          {selectedRoom ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <MetricCard label="Gross area" value={formatArea(selectedRoom.grossArea)} />
                <MetricCard label="Deductions" value={formatArea(deductionArea)} />
                <MetricCard
                  label="Net area"
                  value={formatArea(selectedRoom.netArea)}
                  tone="blue"
                />
                <MetricCard
                  label={`Waste-adjusted (${wastePercentage}%)`}
                  value={formatArea(selectedRoom.wasteAdjustedArea)}
                  tone="green"
                />
              </div>

              <Card>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Room Details</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Maintain room metadata and waste calculations for {selectedRoom.name}.
                    </p>
                  </div>
                  {!isImmutable ? (
                    <button
                      type="button"
                      onClick={handleDeleteRoom}
                      disabled={deletingRoom}
                      className="text-sm font-medium text-rose-700 hover:text-rose-800"
                    >
                      {deletingRoom ? "Deleting..." : "Delete room"}
                    </button>
                  ) : null}
                </div>

                <form onSubmit={handleSaveRoom} className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Room name</label>
                    <Input
                      value={roomForm.name}
                      onChange={(event) => updateRoomField("name", event.target.value)}
                      required
                      disabled={isImmutable}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Floor level</label>
                    <Input
                      value={roomForm.floorLevel}
                      onChange={(event) => updateRoomField("floorLevel", event.target.value)}
                      disabled={isImmutable}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Waste percentage</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={roomForm.wastePercentage}
                      onChange={(event) => updateRoomField("wastePercentage", event.target.value)}
                      disabled={isImmutable}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Existing covering</label>
                    <Input
                      value={roomForm.existingCovering}
                      onChange={(event) => updateRoomField("existingCovering", event.target.value)}
                      disabled={isImmutable}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Subfloor type</label>
                    <select
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                      value={roomForm.subfloorType}
                      onChange={(event) => updateRoomField("subfloorType", event.target.value)}
                      disabled={isImmutable}
                    >
                      <option value="">Not set</option>
                      <option value="CONCRETE">Concrete</option>
                      <option value="SAND_CEMENT_SCREED">Sand cement screed</option>
                      <option value="ANHYDRITE_SCREED">Anhydrite screed</option>
                      <option value="TIMBER_BOARDS">Timber boards</option>
                      <option value="PLYWOOD">Plywood</option>
                      <option value="CHIPBOARD">Chipboard</option>
                      <option value="EXISTING_TILE">Existing tile</option>
                      <option value="EXISTING_RESILIENT">Existing resilient</option>
                      <option value="RAISED_ACCESS">Raised access floor</option>
                      <option value="OTHER">Other</option>
                      <option value="UNKNOWN">Unknown</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Subfloor condition</label>
                    <Input
                      value={roomForm.subfloorCondition}
                      onChange={(event) => updateRoomField("subfloorCondition", event.target.value)}
                      placeholder="Dry, level, patching required"
                      disabled={isImmutable}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      id="underfloorHeating"
                      type="checkbox"
                      checked={roomForm.underfloorHeating}
                      onChange={(event) => updateRoomField("underfloorHeating", event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                      disabled={isImmutable}
                    />
                    <label htmlFor="underfloorHeating" className="text-sm font-medium text-slate-700">
                      Underfloor heating present
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      id="upliftRequired"
                      type="checkbox"
                      checked={roomForm.upliftRequired}
                      onChange={(event) => updateRoomField("upliftRequired", event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                      disabled={isImmutable}
                    />
                    <label htmlFor="upliftRequired" className="text-sm font-medium text-slate-700">
                      Existing floor uplift required
                    </label>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Preparation notes</label>
                    <textarea
                      className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
                      value={roomForm.preparationNotes}
                      onChange={(event) => updateRoomField("preparationNotes", event.target.value)}
                      disabled={isImmutable}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Installation notes</label>
                    <textarea
                      className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
                      value={roomForm.installationNotes}
                      onChange={(event) => updateRoomField("installationNotes", event.target.value)}
                      disabled={isImmutable}
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end">
                    <Button type="submit" disabled={isImmutable || savingRoom}>
                      {savingRoom ? "Saving room..." : "Save room details"}
                    </Button>
                  </div>
                </form>
              </Card>

              <Card>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">
                      {editingComponentId ? "Edit Measurement" : "Add Measurement"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Capture additive and deductive geometry for this room.
                    </p>
                  </div>
                  {editingComponentId ? (
                    <button
                      type="button"
                      onClick={resetComponentEditor}
                      className="text-sm font-medium text-slate-600 hover:text-slate-900"
                    >
                      Cancel edit
                    </button>
                  ) : null}
                </div>

                <form onSubmit={handleSaveComponent} className="mt-5 space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Shape</label>
                      <select
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                        value={componentForm.type}
                        onChange={(event) => setComponentType(event.target.value as ComponentType)}
                        disabled={isImmutable}
                      >
                        {Object.entries(SHAPE_DEFINITIONS).map(([type, definition]) => (
                          <option key={type} value={type}>
                            {definition.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Operation</label>
                      <select
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                        value={componentForm.operation}
                        onChange={(event) => setComponentForm((current) => ({
                          ...current,
                          operation: event.target.value as MeasurementOperation,
                        }))}
                        disabled={isImmutable}
                      >
                        <option value="ADD">Add area</option>
                        <option value="DEDUCT">Deduct area</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
                      <Input
                        value={componentForm.notes}
                        onChange={(event) => setComponentForm((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))}
                        placeholder="Optional note"
                        disabled={isImmutable}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    {SHAPE_DEFINITIONS[componentForm.type].fields.map((field) => (
                      <div key={field.key}>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {field.label}
                        </label>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={componentForm.dimensions[field.key] ?? ""}
                          onChange={(event) => updateComponentDimension(field.key, event.target.value)}
                          required
                          disabled={isImmutable}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isImmutable || savingComponent}>
                      {savingComponent
                        ? editingComponentId
                          ? "Saving measurement..."
                          : "Adding measurement..."
                        : editingComponentId
                          ? "Save measurement"
                          : "Add measurement"}
                    </Button>
                  </div>
                </form>
              </Card>

              <Card>
                <h2 className="text-lg font-semibold text-slate-950">Measurement Components</h2>
                <div className="mt-4 space-y-3">
                  {selectedRoom.components.map((component) => (
                    <div
                      key={component.id}
                      className="rounded-xl border border-slate-200 px-4 py-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                component.operation === "ADD"
                                  ? "bg-sky-100 text-sky-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {component.operation}
                            </span>
                            <span className="text-sm font-semibold text-slate-900">
                              {SHAPE_DEFINITIONS[component.type].label}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">{componentSummary(component)}</p>
                          {component.notes ? (
                            <p className="text-sm text-slate-500">{component.notes}</p>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-semibold text-slate-950">
                              {component.operation === "DEDUCT" ? "-" : ""}
                              {formatArea(component.calculatedArea)} m2
                            </p>
                          </div>
                          {!isImmutable ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEditingComponent(component)}
                                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteComponent(component.id)}
                                disabled={deletingComponentId === component.id}
                                className="rounded-md border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
                              >
                                {deletingComponentId === component.id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}

                  {!selectedRoom.components.length ? (
                    <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                      No measurement components have been added to this room yet.
                    </div>
                  ) : null}
                </div>
              </Card>
            </>
          ) : (
            <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500">
              Select a room to edit details and capture measurements.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
