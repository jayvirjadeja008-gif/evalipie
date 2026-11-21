import { useNavigate, useSearchParams } from "react-router-dom";
import { LoginGateway } from "../components/LoginGateway";

export default function Login() {
  const nav = useNavigate();
  const [sp] = useSearchParams();

  return (
    <LoginGateway
      fullPage
      onSuccess={() => {
        nav(sp.get("next") || "/", { replace: true });
      }}
    />
  );
}
