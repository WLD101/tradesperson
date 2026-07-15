"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { Card, Button, Input } from "@tradesperson/ui";

const IMMUTABLE_STATES = ["COMPLETED", "REVIEWED", "APPROVED", "SUPERSEDED", "CANCELLED"];

export default function SurveyMeasurementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [surveyId, setSurveyId] = useState<string>("");
  const [survey, setSurvey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  
  const [newRoomName, setNewRoomName] = useState("");
  const [addingRoom, setAddingRoom] = useState(false);

  const [newComponentType, setNewComponentType] = useState("RECTANGLE");
  const [newComponentOp, setNewComponentOp] = useState("ADD");
  const [newComponentLength, setNewComponentLength] = useState("");
  const [newComponentWidth, setNewComponentWidth] = useState("");
  const [addingComponent, setAddingComponent] = useState(false);

  useEffect(() => {
    params.then((p) => {
      setSurveyId(p.id);
      loadSurvey(p.id);
    });
  }, [params]);

  const loadSurvey = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/surveys/${id}`);
      if (!res.ok) throw new Error("Failed to load survey");
      const data = await res.json();
      setSurvey(data.data);
      if (data.data.rooms?.length > 0 && !selectedRoomId) {
        setSelectedRoomId(data.data.rooms[0].id);
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const isImmutable = survey && IMMUTABLE_STATES.includes(survey.status);

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setAddingRoom(true);
    try {
      const res = await fetch(`/api/v1/surveys/${surveyId}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoomName }),
      });
      if (!res.ok) throw new Error("Failed to add room");
      const newRoom = await res.json();
      setNewRoomName("");
      setSelectedRoomId(newRoom.data.id);
      await loadSurvey(surveyId);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAddingRoom(false);
    }
  };

  const handleAddComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) return;
    setAddingComponent(true);
    try {
      const dimensions = {
        length: parseFloat(newComponentLength),
        width: parseFloat(newComponentWidth),
      };
      
      if (dimensions.length <= 0 || dimensions.width <= 0) {
         throw new Error("Dimensions must be positive values.");
      }
      
      const res = await fetch(`/api/v1/surveys/${surveyId}/rooms/${selectedRoomId}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newComponentType,
          operation: newComponentOp,
          dimensions,
        }),
      });
      
      if (!res.ok) throw new Error("Failed to add component");
      
      setNewComponentLength("");
      setNewComponentWidth("");
      await loadSurvey(surveyId);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAddingComponent(false);
    }
  };

  const handleDeleteComponent = async (compId: string) => {
    if (!window.confirm("Are you sure you want to delete this measurement?")) return;
    try {
      const res = await fetch(`/api/v1/surveys/${surveyId}/rooms/${selectedRoomId}/components/${compId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete component");
      await loadSurvey(surveyId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="p-4 text-slate-500">Loading measurements...</div>;
  if (!survey) return <div className="p-4 text-red-500">{error}</div>;

  const selectedRoom = survey.rooms?.find((r: any) => r.id === selectedRoomId);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link
          href={`/app/crm/surveys/${surveyId}`}
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          &larr; Back to Survey
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-950">Measurements</h1>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800">
            {survey.status}
          </span>
        </div>
      </div>

      {isImmutable && (
        <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800 border border-yellow-200">
          This survey is in an immutable state ({survey.status}). Measurements cannot be modified.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar: Rooms */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <h2 className="text-sm font-medium text-slate-900 mb-3">Rooms</h2>
            
            <div className="space-y-1">
              {survey.rooms?.map((room: any) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                    selectedRoomId === room.id
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {room.name}
                </button>
              ))}
              {!survey.rooms?.length && (
                <p className="text-sm text-slate-500 py-2">No rooms added yet.</p>
              )}
            </div>

            {!isImmutable && (
              <form onSubmit={handleAddRoom} className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                <Input
                  placeholder="New room name..."
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="!text-sm"
                  required
                />
                <Button type="submit" disabled={addingRoom || !newRoomName.trim()} className="w-full !py-1.5 !text-xs">
                  {addingRoom ? "Adding..." : "Add Room"}
                </Button>
              </form>
            )}
          </Card>
        </div>

        {/* Main: Room Details & Components */}
        <div className="lg:col-span-3 space-y-6">
          {selectedRoom ? (
            <>
              {/* Room Totals */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="!p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Gross Area</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{selectedRoom.grossArea} m²</p>
                </Card>
                <Card className="!p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Deductions</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{selectedRoom.netArea !== selectedRoom.grossArea ? "-" : ""}{Math.abs(selectedRoom.grossArea - selectedRoom.netArea).toFixed(2)} m²</p>
                </Card>
                <Card className="!p-4 bg-blue-50/50 border-blue-100">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Net Area</p>
                  <p className="mt-1 text-2xl font-semibold text-blue-900">{selectedRoom.netArea} m²</p>
                </Card>
                <Card className="!p-4 bg-green-50/50 border-green-100">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Waste Adj. ({selectedRoom.wastePercentage}%)</p>
                  <p className="mt-1 text-2xl font-semibold text-green-900">{selectedRoom.wasteAdjustedArea} m²</p>
                </Card>
              </div>

              {/* Add Component Form */}
              {!isImmutable && (
                <Card>
                  <h3 className="text-sm font-medium text-slate-900 mb-4">Add Measurement</h3>
                  <form onSubmit={handleAddComponent} className="flex items-end gap-3">
                    <div className="w-32">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                      <select 
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none"
                        value={newComponentType}
                        onChange={(e) => setNewComponentType(e.target.value)}
                      >
                        <option value="RECTANGLE">Rectangle</option>
                        <option value="TRIANGLE">Triangle</option>
                      </select>
                    </div>
                    <div className="w-28">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Operation</label>
                      <select 
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none"
                        value={newComponentOp}
                        onChange={(e) => setNewComponentOp(e.target.value)}
                      >
                        <option value="ADD">Add</option>
                        <option value="DEDUCT">Deduct</option>
                      </select>
                    </div>
                    <div className="w-24">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Length (m)</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={newComponentLength}
                        onChange={(e) => setNewComponentLength(e.target.value)}
                        required
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Width (m)</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={newComponentWidth}
                        onChange={(e) => setNewComponentWidth(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={addingComponent} className="mb-[2px]">
                      Add
                    </Button>
                  </form>
                </Card>
              )}

              {/* Component List */}
              <Card>
                <h3 className="text-sm font-medium text-slate-900 mb-4">Measurements</h3>
                <div className="space-y-3">
                  {selectedRoom.components?.map((comp: any) => (
                    <div key={comp.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center gap-4">
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${comp.operation === 'ADD' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                          {comp.operation}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{comp.type}</p>
                          <p className="text-xs text-slate-500">
                            {comp.dimensions?.length}m × {comp.dimensions?.width}m
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-medium text-slate-900">
                          {comp.operation === 'DEDUCT' ? '-' : ''}{comp.calculatedArea} m²
                        </span>
                        {!isImmutable && (
                          <button
                            onClick={() => handleDeleteComponent(comp.id)}
                            className="text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {!selectedRoom.components?.length && (
                    <div className="text-center py-6 text-sm text-slate-500">
                      No measurements added to this room yet.
                    </div>
                  )}
                </div>
              </Card>
            </>
          ) : (
            <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500">
              Select or add a room to view and edit measurements.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
