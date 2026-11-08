import "server-only";

import { headers } from "next/headers";
import { isMobileUA } from "@/lib/device";

/** 지금 요청이 휴대폰·태블릿에서 왔는지 */
export async function isMobileRequest() {
  return isMobileUA((await headers()).get("user-agent") ?? "");
}
