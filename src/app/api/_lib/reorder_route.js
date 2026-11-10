import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { invalidateListCache } from "@/app/api/_lib/list_cache";
import { getDb } from "@/app/api/_lib/mongo";

/**
 * Shared GET/POST pair for the drag-and-drop reorder pages.
 *
 * GET  returns the whole collection ordered by `order`, which is what
 *      ReorderLayout expects.
 * POST accepts `{ orderedIds }` and rewrites `order` to 1..n as strings,
 *      matching the existing artwork / event / exhibition routes.
 *
 * A factory keeps every collection on the same semantics instead of a copy
 * per entity (the older routes had drifted).
 */
export function createReorderRoute(collectionName, { orderField = "order" } = {}) {
  async function GET() {
    try {
      const db = await getDb();
      const items = await db
        .collection(collectionName)
        .find({})
        .sort({ [orderField]: 1 })
        .toArray();
      return NextResponse.json(items, { status: 200 });
    } catch (error) {
      console.log(`Failed to fetch ${collectionName} for reorder:`, error);
      return NextResponse.json(
        { message: `Failed to fetch ${collectionName}`, error: error.message },
        { status: 500 }
      );
    }
  }

  async function POST(request) {
    try {
      const { orderedIds } = await request.json();
      if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
        return NextResponse.json(
          { error: "orderedIds must be a non-empty array" },
          { status: 400 }
        );
      }

      const db = await getDb();
      const collection = db.collection(collectionName);

      const operations = orderedIds
        .map((id, index) => {
          if (!ObjectId.isValid(String(id))) return null;
          return {
            updateOne: {
              filter: { _id: new ObjectId(String(id)) },
              update: { $set: { [orderField]: String(index + 1) } },
            },
          };
        })
        .filter(Boolean);

      if (operations.length === 0) {
        return NextResponse.json({ error: "No valid ids supplied" }, { status: 400 });
      }

      const result = await collection.bulkWrite(operations);
      invalidateListCache(collectionName);

      return NextResponse.json(
        { success: true, updated: result.modifiedCount ?? operations.length },
        { status: 200 }
      );
    } catch (error) {
      console.log(`Error updating ${collectionName} order:`, error);
      return NextResponse.json(
        { error: `Failed to update ${collectionName} order.`, details: error?.message || error },
        { status: 500 }
      );
    }
  }

  return { GET, POST };
}
