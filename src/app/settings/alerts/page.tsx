import { redirect } from "next/navigation";

export default function SettingsAlertsRedirect() {
  redirect("/dashboard/alerts");
}
