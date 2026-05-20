interface PlaceholderPageProps {
    title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
    return (
        <div style={{ padding: 24 }}>
            <h1>{title}</h1>
            <p>Page will be implemented later.</p>
        </div>
    );
}