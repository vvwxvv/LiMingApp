import { createReorderRoute } from "@/app/api/_lib/reorder_route";
import { aboutApiConfig } from "@/app/api/_config/about_api_config";

const route = createReorderRoute(aboutApiConfig.collectionName);

export const GET = route.GET;
export const POST = route.POST;
