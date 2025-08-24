// app/styleguide/page.tsx
export default function StyleGuide() {
  return (
    <div className="mx-auto max-w-6xl p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Style Guide</h1>
        <p className="text-neutral-600">Tokens, components, and patterns used across the app.</p>
      </header>

      {/* Brand palette */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Colors</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            ['Primary', 'bg-sky-600'],
            ['Primary/hover', 'bg-sky-700'],
            ['Accent', 'bg-emerald-600'],
            ['Muted', 'bg-slate-200'],
            ['Warn', 'bg-amber-500'],
          ].map(([name, cls]) => (
            <div key={name} className="rounded-xl border overflow-hidden">
              <div className={`h-14 ${cls}`} />
              <div className="p-2 text-sm">{name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Typography</h2>
        <div className="space-y-2">
          <div className="text-3xl font-bold">H1 / Big headline</div>
          <div className="text-2xl font-semibold">H2 / Section title</div>
          <div className="text-lg font-medium">H3 / Subsection</div>
          <p className="text-neutral-700">Body text — balanced line-height for readable menus & admin tables.</p>
          <p className="text-sm text-neutral-500">Small text — hints, helper copy, timestamps.</p>
        </div>
      </section>

      {/* Buttons */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-lg bg-sky-600 text-white px-4 py-2 hover:bg-sky-700">Primary</button>
          <button className="rounded-lg border px-4 py-2 hover:bg-neutral-50">Secondary</button>
          <button className="rounded-lg bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700">Confirm</button>
          <button className="rounded-lg bg-amber-500 text-white px-4 py-2 hover:bg-amber-600">Warn</button>
        </div>
      </section>

      {/* Card + form pattern */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Cards & Forms</h2>
        <div className="rounded-2xl border p-4 space-y-3">
          <div className="font-semibold">Example Form</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-neutral-600">Label</span>
              <input className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2" placeholder="Type…" />
            </label>
            <label className="block text-sm">
              <span className="text-neutral-600">Select</span>
              <select className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2">
                <option>Option A</option>
                <option>Option B</option>
              </select>
            </label>
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg bg-sky-600 text-white px-4 py-2">Save</button>
            <button className="rounded-lg border px-4 py-2">Cancel</button>
          </div>
        </div>
      </section>

      {/* Table pattern */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Table</h2>
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full table-auto">
            <thead className="text-left text-sm text-neutral-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {['Tilapia Plate', 'Shrimp Plate'].map((n) => (
                <tr key={n} className="border-t">
                  <td className="px-4 py-3">{n}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-green-50 text-green-700 border border-green-200 text-xs px-2 py-0.5">Active</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="rounded border px-2 py-1 text-sm">Edit</button>
                      <button className="rounded border px-2 py-1 text-sm">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Empty state */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Empty State</h2>
        <div className="rounded-2xl border p-10 text-center space-y-2">
          <div className="text-lg font-medium">No items yet</div>
          <p className="text-sm text-neutral-500">Create your first category or menu item to get started.</p>
          <button className="rounded-lg bg-sky-600 text-white px-4 py-2">New Item</button>
        </div>
      </section>
    </div>
  )
}
