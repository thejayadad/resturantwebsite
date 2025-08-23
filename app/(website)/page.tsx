import { auth } from "@/auth";
import SignInBtn from "@/components/ui/auth/signin-btn";
import SignOutBtn from "@/components/ui/auth/signout-btn";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth()
  if(session){
    redirect('/dashboard')
  }
  return (
    <div>
      LandingPAge
    </div>
  );
}
