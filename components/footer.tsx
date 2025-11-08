export function Footer() {
  return (
    <footer className="border-t">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Karina&apos;s Bookkeeping Service</p>
        </div>
      </div>
    </footer>
  );
}

