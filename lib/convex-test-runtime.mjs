import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { anyApi, getFunctionName } from "convex/server";

// Production handlers with only the Convex runtime/auth boundary replaced. No live services.
const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../convex");
const modules = new Map();
const staff = async (ctx) => { if (!ctx.staff) throw new Error("Authentication required"); return "staff"; };
export function load(name) {
  const file = resolve(root, extname(name) ? name : `${name}.ts`);
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} };
  modules.set(file, module);
  const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { allowJs: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const localRequire = (id) => {
    if (id === "./_generated/api") return { api: anyApi, internal: anyApi };
    if (id === "./_generated/server") return Object.fromEntries(["mutation", "query", "internalMutation", "internalAction"].map((key) => [key, (config) => config]));
    if (id === "./security") return { requireStaff: staff, isStaff: async (ctx) => Boolean(ctx.staff), isAutomationKey: (key) => key === "automation", requireServiceKey: (key) => { if (key !== "sona") throw new Error("Invalid service credential"); }, requireStaffOrAutomation: async (ctx, key) => { if (key !== "automation") await staff(ctx); } };
    return id.startsWith(".") ? load(resolve(dirname(file), id)) : require(id);
  };
  new Function("require", "module", "exports", code)(localRequire, module, module.exports);
  return module.exports;
}

export function context() {
  let sequence = 0;
  const tables = new Map();
  const rows = (table) => { if (!tables.has(table)) tables.set(table, []); return tables.get(table); };
  const get = (id) => [...tables.values()].flat().find((row) => row._id === id) || null;
  const ctx = {
    staff: true, scheduled: [], rows,
    db: {
      async insert(table, data) { const id = `${table}:${++sequence}`; rows(table).push({ ...structuredClone(data), _id: id }); return id; },
      async get(id) { return get(id); },
      async patch(id, patch) { assert.ok(get(id), `Missing row ${id}`); Object.assign(get(id), structuredClone(patch)); },
      query(table) {
        const filters = [];
        const predicates = [];
        let descending = false;
        const all = () => { const result = rows(table).filter((row) => filters.every(([key, value]) => row[key] === value) && predicates.every((predicate) => predicate(row))); return descending ? result.toReversed() : result; };
        return {
          withIndex(_name, callback) { if (callback) { const q = { eq(key, value) { filters.push([key, value]); return q; } }; callback(q); } return this; },
          filter(callback) { predicates.push(callback({ field: (key) => (row) => row[key], eq: (field, value) => (row) => field(row) === value })); return this; },
          order(direction) { descending = direction === "desc"; return this; },
          async first() { return all()[0] || null; }, async collect() { return all(); }, async take(count) { return all().slice(0, count); },
          async paginate({ cursor, numItems }) { const start = Number(cursor || 0); const result = all(); return { page: result.slice(start, start + numItems), isDone: start + numItems >= result.length, continueCursor: String(start + numItems) }; },
        };
      },
    },
    scheduler: { async runAfter(delay, fn, args) { ctx.scheduled.push({ delay, fn: getFunctionName(fn), args }); } },
    async runMutation(fn, args) { const [name, method] = getFunctionName(fn).split(":"); return load(name)[method].handler(ctx, args); },
  };
  return ctx;
}
