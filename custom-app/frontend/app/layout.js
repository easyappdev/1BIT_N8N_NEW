import './globals.css'

export const metadata = {
    title: 'WhatsApp Multi-Agent',
    description: 'Manager Platform',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}
