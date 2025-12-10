export const metadata = {
  title: 'Wecare E-commerce - Siêu thị công nghiệp',
  description: 'Đăng nhập vào hệ thống Wecare E-commerce',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>{children}</>
  )
}
