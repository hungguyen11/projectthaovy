import { redirect } from "next/navigation";

/**
 * Web ở chế độ công khai: mở đường dẫn là VÀO THẲNG Tổng quan (không qua landing/đăng nhập).
 * © _hngnguynn_
 */
export default function Home() {
  redirect("/dashboard");
}
