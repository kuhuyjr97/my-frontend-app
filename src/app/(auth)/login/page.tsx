import { redirect } from 'next/navigation'

/** Đăng nhập mặc định dùng UI V2 */
export default function LoginPage() {
  redirect('/v2/login')
}
