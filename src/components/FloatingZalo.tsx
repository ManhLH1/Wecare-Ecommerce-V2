"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ZaloIcon from "@/assets/img/Icon_of_Zalo.svg.webp";

export default function FloatingZalo() {
	const pathname = usePathname();
	const [isHidden, setIsHidden] = useState(false);
	const [isMinimized, setIsMinimized] = useState(true); // Luôn bắt đầu với trạng thái thu gọn
	const [isCartOpen, setIsCartOpen] = useState(false);

	// All hooks must be declared before any conditional returns
	useEffect(() => {
		try {
			const stored = typeof window !== "undefined" ? localStorage.getItem("wecare_hide_floating_zalo") : null;
			if (stored === "1") setIsHidden(true);
		} catch {}
	}, []);

	// Phát hiện khi Cart mở/đóng
	useEffect(() => {
		const checkCartState = () => {
			// Kiểm tra xem có element Cart nào đang mở không
			const cartWeb = document.querySelector('.fixed.inset-0.z-\\[9999\\]');
			const cartMobile = document.querySelector('.fixed.inset-0.z-50');
			const isOpen = !!(cartWeb || cartMobile);
			setIsCartOpen(isOpen);
		};

		// Kiểm tra ban đầu
		checkCartState();

		// Tạo MutationObserver để theo dõi thay đổi DOM
		const observer = new MutationObserver(checkCartState);
		observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['class']
		});

		return () => observer.disconnect();
	}, []);

	// Ẩn FloatingZalo trong admin app - MUST be after all hooks
	if (pathname?.includes('/admin-app')) {
		return null;
	}

	if (isHidden) {
		return (
			<button data-floating-zalo
				onClick={() => {
					setIsHidden(false);
					setIsMinimized(true);
					try { localStorage.removeItem("wecare_hide_floating_zalo"); } catch {}
				}}
				className={`fixed bottom-24 right-3 md:bottom-28 md:right-4 z-[9998] h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 shadow-xl ring-2 ring-white/40 hover:ring-blue-300 transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 flex items-center justify-center group animate-bounce-subtle ${isCartOpen ? 'md:right-96' : ''}`}
				aria-label="Hiện lại biểu tượng Zalo"
				title="Hiện Zalo"
			>
				<div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400/30 to-blue-600/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
				<Image
					src={ZaloIcon}
					alt="Zalo"
					width={28}
					height={28}
					className="md:w-8 md:h-8 rounded-full relative z-10 transition-transform duration-300 group-hover:rotate-12 drop-shadow-lg"
				/>
				<div className="absolute -top-0.5 -right-0.5 h-3 w-3 md:h-4 md:w-4 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center shadow-md border-1.5 border-white">
					<div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-white animate-ping"></div>
				</div>
			</button>
		);
	}

	if (isMinimized) {
		return (
			<div data-floating-zalo className={`fixed bottom-32 right-3 md:bottom-28 md:right-4 z-[9998] animate-fade-in ${isCartOpen ? 'md:right-96' : ''}`}>
				<div className="relative group">
					<button
						onClick={() => setIsMinimized(false)}
						className="block h-11 w-11 md:h-12 md:w-12 rounded-full bg-blue-600 shadow-lg ring-2 ring-white/40 hover:bg-blue-700 transition-all duration-200 flex items-center justify-center"
						aria-label="Mở nhanh kênh liên hệ"
						title="Liên hệ"
					>
						{/* Generic chat icon for better neutrality */}
						<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-white">
							<path d="M21 15a4 4 0 0 1-4 4H9l-4 3v-3H5a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v8Z" fill="currentColor"/>
						</svg>
					</button>
				</div>
			</div>
		);
	}

	return (
		<div data-floating-zalo className={`fixed bottom-24 right-3 md:bottom-28 md:right-4 z-[9998] animate-fade-in ${isCartOpen ? 'md:right-96' : ''}`}>
			<div className="relative">
				{/* Card with channels */}
				<div className="mb-2 w-56 rounded-xl bg-white shadow-xl border border-gray-200 overflow-hidden">
					<div className="flex items-center justify-between px-3 py-2 bg-blue-600 text-white">
						<span className="text-sm font-semibold">Liên hệ Wecare</span>
						<button
							onClick={() => setIsMinimized(true)}
							aria-label="Thu gọn liên hệ"
							className="h-6 w-6 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center"
						>
							×
						</button>
					</div>
					<ul className="p-2 space-y-1">
						<li>
							<Link href="https://zalo.me/3642371097976835684" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
								<Image src={ZaloIcon} alt="Zalo" width={20} height={20} className="rounded" />
								<span className="text-sm text-gray-800">Zalo</span>
							</Link>
						</li>
						<li className="md:hidden">
							<a href="tel:0983161162" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-blue-600"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.9.31 1.77.57 2.61a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.47-1.09a2 2 0 0 1 2.11-.45c.84.26 1.71.45 2.61.57A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
								<span className="text-sm text-gray-800">Gọi 0983 161 162</span>
							</a>
						</li>
						<li>
							<Link href="https://www.facebook.com/wecareyourproduct" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-blue-600"><path d="M22 12.07C22 6.48 17.52 2 11.93 2 6.34 2 1.86 6.48 1.86 12.07c0 4.99 3.65 9.13 8.43 9.93v-7.03H7.9v-2.9h2.39V9.41c0-2.36 1.4-3.66 3.55-3.66 1.03 0 2.1.18 2.1.18v2.31h-1.18c-1.16 0-1.52.72-1.52 1.46v1.75h2.59l-.41 2.9h-2.18V22c4.78-.8 8.43-4.94 8.43-9.93z"/></svg>
								<span className="text-sm text-gray-800">Facebook</span>
							</Link>
						</li>
						<li>
							<Link href="https://www.tiktok.com/@wecaresieuthicongnghiep?_t=ZS-8zYG0SMLRxQ&_r=1" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-blue-600"><path d="M16.5 3.5c.7 1.6 2.1 2.8 3.8 3.2v3.1c-1.7 0-3.3-.6-4.6-1.6v6.8c0 3.6-2.9 6.5-6.5 6.5S2.7 18.6 2.7 15s2.9-6.5 6.5-6.5c.4 0 .7 0 1.1.1v3.2c-.3-.1-.7-.2-1.1-.2-1.8 0-3.3 1.5-3.3 3.3S7.4 18.2 9.2 18.2s3.3-1.5 3.3-3.3V2.5h4z"/></svg>
								<span className="text-sm text-gray-800">TikTok</span>
							</Link>
						</li>
					</ul>
				</div>

				{/* Mini toggle button */}
				<button
					onClick={() => setIsMinimized(true)}
					className="h-11 w-11 md:h-12 md:w-12 rounded-full bg-blue-600 shadow-lg ring-2 ring-white/40 hover:bg-blue-700 transition-all duration-200 flex items-center justify-center"
					aria-label="Thu gọn"
				>
					<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-white">
						<path d="M21 15a4 4 0 0 1-4 4H9l-4 3v-3H5a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v8Z" fill="currentColor"/>
					</svg>
				</button>
			</div>
		</div>
	);
}


