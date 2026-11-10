import { createReorderRoute } from "@/app/api/_lib/reorder_route";
import { seriesApiConfig } from "@/app/api/_config/series_api_config";

const route = createReorderRoute(seriesApiConfig.collectionName);

export const GET = route.GET;
export const POST = route.POST;
