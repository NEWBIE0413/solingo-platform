import { auth } from "@/lib/session";
import { redirect } from "next/navigation";

import { getIsAdmin } from "@/lib/admin";
import { App } from "./app";

const AdminPage = async () => {
  await auth.protect();

  const isAdmin = await getIsAdmin();

  if (!isAdmin) redirect("/");

  return <App />;
};

export default AdminPage;
