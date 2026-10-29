import { redirect } from "next/navigation";
import { documentationPath } from "@/lib/documentation";

export default function PopsRedirectPage() {
  redirect(documentationPath("pops"));
}
