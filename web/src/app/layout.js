import './globals.css';

export const metadata = {
  title: 'ระบบบริหารโครงการและเบิกจ่าย',
  description: 'Project and Expense Management System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
