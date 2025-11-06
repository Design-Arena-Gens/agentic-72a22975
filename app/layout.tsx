import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'FIIs Log?stica - Pre?o Teto',
  description: 'Avalia??o de FIIs de Log?stica com pre?o teto ajustado pela SELIC',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-br">
      <body>
        <div className="container">
          <header>
            <h1>FIIs Log?stica ? Pre?o Teto</h1>
            <p>Pre?o teto atualizado pela taxa de juros (SELIC) e avalia??o com base no pre?o atual.</p>
          </header>
          <main>{children}</main>
          <footer>
            <small>Dados de mercado via brapi.dev ? SELIC via BCB ? Sem garantias</small>
          </footer>
        </div>
      </body>
    </html>
  );
}
