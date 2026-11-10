import { createReorderRoute } from "@/app/api/_lib/reorder_route";
import { bibliographyApiConfig } from "@/app/api/_config/bibliography_api_config";

const route = createReorderRoute(bibliographyApiConfig.collectionName);

export const GET = route.GET;
export const POST = route.POST;
