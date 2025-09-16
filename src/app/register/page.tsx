export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-bg font-poppins p-6">
      <div
        className="max-w-lg w-full bg-white p-6 rounded-md shadow"
        style={{ border: "1px solid var(--beige-sand)" }}
      >
        <h1 className="text-xl font-semibold text-accent mb-2">
          Registration Disabled
        </h1>
        <p className="text-sm text-muted">
          Public registration is disabled. Please contact an administrator to
          create your account.
        </p>
      </div>
    </main>
  );
}
