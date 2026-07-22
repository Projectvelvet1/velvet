import Link from "next/link";
export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, fontFamily: "system-ui" }}>
      <h2 style={{ margin: 0 }}>Page not found</h2>
      <Link href="/" style={{ color: "#3D4EE8" }}>Go to Velvet</Link>
    </div>
  );
}
