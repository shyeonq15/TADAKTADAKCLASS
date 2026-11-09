import "server-only";

import { headers } from "next/headers";
import { isPhoneUA } from "@/lib/device";

/** 지금 요청이 휴대폰에서 왔는지 (태블릿은 화면에서 키보드를 확인해요) */
export async function isPhoneRequest() {
  return isPhoneUA((await headers()).get("user-agent") ?? "");
}
