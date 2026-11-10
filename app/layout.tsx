import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'NEXT GESTÃO - Gestão de Serviços Elétricos',
  description: 'Sistema integrado de gestão para empresas de serviços elétricos, instalações, manutenção, formação de preços, fluxo de caixa e propostas comerciais.',
  openGraph: {
    title: 'NEXT GESTÃO - Gestão de Serviços Elétricos',
    description: 'Sistema integrado de gestão para empresas de serviços elétricos, instalações, manutenção, formação de preços, fluxo de caixa e propostas comerciais.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NEXT GESTÃO - Gestão de Serviços Elétricos',
    description: 'Sistema integrado de gestão para empresas de serviços elétricos, instalações, manutenção, formação de preços, fluxo de caixa e propostas comerciais.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
