import { 
  PageHeader, 
  Breadcrumbs, 
  StatusBadge, 
  SummaryStrip,
  DataTable,
  EmptyState,
  DateDisplay,
  Money,
  ActivityTimeline,
  FilterBar,




} from "@/components/shared";

export default function DesignSystemPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-16">
      <section>
        <PageHeader 
          title="Design System" 
          description="A preview of the shared UI foundation for the ERP."
        />
        <Breadcrumbs items={[{ label: "Dashboard", href: "#" }, { label: "Design System" }]} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-medium text-slate-800 border-b pb-2">Status Badges</h2>
        <div className="flex gap-4">
          <StatusBadge status="Draft" color="slate" />
          <StatusBadge status="Approved" color="green" />
          <StatusBadge status="In Progress" color="blue" />
          <StatusBadge status="Pending" color="amber" />
          <StatusBadge status="Rejected" color="red" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-medium text-slate-800 border-b pb-2">Summary Strip</h2>
        <SummaryStrip items={[
          { label: "Customer", value: "Acme Corp" },
          { label: "Date", value: <DateDisplay date={new Date().toISOString()} /> },
          { label: "Value", value: <Money amount={1250.50} /> },
          { label: "Status", value: <StatusBadge status="Approved" color="green" /> }
        ]} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-medium text-slate-800 border-b pb-2">Data Table</h2>
        <FilterBar>
          <input type="text" placeholder="Search..." className="border rounded px-3 py-1.5 text-sm w-64" />
          <button className="bg-slate-900 text-white px-3 py-1.5 rounded text-sm font-medium">Filter</button>
        </FilterBar>
        <DataTable headers={["ID", "Name", "Date", "Status"]}>
          <tr>
            <td className="px-4 py-3">#1234</td>
            <td className="px-4 py-3 font-medium">Alice Smith</td>
            <td className="px-4 py-3"><DateDisplay date={new Date().toISOString()} /></td>
            <td className="px-4 py-3"><StatusBadge status="Active" color="green" /></td>
          </tr>
          <tr>
            <td className="px-4 py-3">#1235</td>
            <td className="px-4 py-3 font-medium">Bob Jones</td>
            <td className="px-4 py-3"><DateDisplay date={new Date().toISOString()} /></td>
            <td className="px-4 py-3"><StatusBadge status="Pending" color="amber" /></td>
          </tr>
        </DataTable>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-medium text-slate-800 border-b pb-2">Empty State</h2>
        <EmptyState 
          title="No requisitions found" 
          description="Get started by creating a new requisition for materials."
          action={<button className="bg-slate-900 text-white px-4 py-2 rounded text-sm font-medium mt-4">Create Requisition</button>}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-medium text-slate-800 border-b pb-2">Activity Timeline</h2>
        <ActivityTimeline items={[
          { id: "1", user: "John Doe", action: "approved the requisition", date: new Date().toISOString() },
          { id: "2", user: "System", action: "created purchase order #PO-001", date: new Date().toISOString() }
        ]} />
      </section>
      
    </div>
  );
}
