module.exports = [
"[project]/src/components/app/AppShell.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AppShell
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$dashboard$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutDashboard$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/layout-dashboard.mjs [app-ssr] (ecmascript) <export default as LayoutDashboard>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2d$search$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__PackageSearch$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/package-search.mjs [app-ssr] (ecmascript) <export default as PackageSearch>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$hand$2d$coins$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__HandCoins$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/hand-coins.mjs [app-ssr] (ecmascript) <export default as HandCoins>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Wallet$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/wallet.mjs [app-ssr] (ecmascript) <export default as Wallet>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$spreadsheet$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FileSpreadsheet$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-spreadsheet.mjs [app-ssr] (ecmascript) <export default as FileSpreadsheet>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/log-out.mjs [app-ssr] (ecmascript) <export default as LogOut>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$logo$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/logo.tsx [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
const NAV_ITEMS = [
    {
        href: '/dashboard',
        label: 'Dashboard',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$dashboard$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutDashboard$3e$__["LayoutDashboard"]
    },
    {
        href: '/estoque',
        label: 'Estoque',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2d$search$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__PackageSearch$3e$__["PackageSearch"]
    },
    {
        href: '/doacoes',
        label: 'Doações',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$hand$2d$coins$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__HandCoins$3e$__["HandCoins"]
    },
    {
        href: '/caixa',
        label: 'Caixa',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Wallet$3e$__["Wallet"]
    },
    {
        href: '/cotacoes',
        label: 'Cotações',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$spreadsheet$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FileSpreadsheet$3e$__["FileSpreadsheet"]
    }
];
const PAGE_TITLES = {
    '/dashboard': 'Dashboard',
    '/estoque': 'Estoque',
    '/doacoes': 'Doações',
    '/caixa': 'Caixa',
    '/cotacoes': 'Cotações'
};
function AppShell({ children }) {
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePathname"])();
    const title = PAGE_TITLES[pathname] ?? 'ATLAS';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex min-h-screen w-full bg-background text-foreground",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                className: "hidden md:flex w-64 shrink-0 flex-col border-r border-border-line/20 bg-background px-4 py-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-2 mb-8",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$logo$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Logo"], {
                            src: "/logo.svg",
                            alt: "Logo ATLAS",
                            text: "ATLAS",
                            href: "/dashboard"
                        }, void 0, false, {
                            fileName: "[project]/src/components/app/AppShell.tsx",
                            lineNumber: 40,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/app/AppShell.tsx",
                        lineNumber: 39,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                        className: "flex flex-col gap-1",
                        children: NAV_ITEMS.map((item)=>{
                            const Icon = item.icon;
                            const active = pathname === item.href;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                href: item.href,
                                className: `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'bg-primary text-background shadow-sm' : 'text-foreground/70 hover:bg-primary/10 hover:text-primary'}`,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                        size: 18
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/app/AppShell.tsx",
                                        lineNumber: 57,
                                        columnNumber: 17
                                    }, this),
                                    item.label
                                ]
                            }, item.href, true, {
                                fileName: "[project]/src/components/app/AppShell.tsx",
                                lineNumber: 48,
                                columnNumber: 15
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/src/components/app/AppShell.tsx",
                        lineNumber: 43,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-auto pt-6 border-t border-border-line/20",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            href: "/",
                            className: "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/60 hover:bg-primary/10 hover:text-primary transition-colors",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__["LogOut"], {
                                    size: 18
                                }, void 0, false, {
                                    fileName: "[project]/src/components/app/AppShell.tsx",
                                    lineNumber: 69,
                                    columnNumber: 13
                                }, this),
                                "Sair"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/app/AppShell.tsx",
                            lineNumber: 65,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/app/AppShell.tsx",
                        lineNumber: 64,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/app/AppShell.tsx",
                lineNumber: 38,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 flex flex-col min-w-0",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                        className: "sticky top-0 z-40 flex items-center justify-between border-b border-border-line/20 bg-background/90 backdrop-blur px-6 py-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "text-lg font-medium tracking-tight",
                                children: title
                            }, void 0, false, {
                                fileName: "[project]/src/components/app/AppShell.tsx",
                                lineNumber: 78,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2 text-sm text-foreground/60",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold",
                                        children: "G"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/app/AppShell.tsx",
                                        lineNumber: 80,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "hidden sm:inline",
                                        children: "Gerente SOS Criança"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/app/AppShell.tsx",
                                        lineNumber: 83,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/app/AppShell.tsx",
                                lineNumber: 79,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/app/AppShell.tsx",
                        lineNumber: 77,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                        className: "flex-1 p-6 bg-background",
                        children: children
                    }, void 0, false, {
                        fileName: "[project]/src/components/app/AppShell.tsx",
                        lineNumber: 87,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/app/AppShell.tsx",
                lineNumber: 76,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/app/AppShell.tsx",
        lineNumber: 36,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/components/ui/logo.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * ============================================================
 * COMPONENT NAME: Logo
 * ============================================================
 * Purpose: A flexible brand logo component supporting an icon/image, 
 * brand text, custom dimensions, and optional link navigation.
 */ __turbopack_context__.s([
    "Logo",
    ()=>Logo,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-ssr] (ecmascript)");
;
;
;
const Logo = ({ src, alt = 'Company Logo', text, href = '/', width = 36, height = 36, className = '', textClassName = '', textPosition = 'right' })=>{
    // Combine base alignment classes with user-provided styling
    const containerClasses = `inline-flex items-center gap-2.5 select-none focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-md transition-opacity hover:opacity-90 ${textPosition === 'left' ? 'flex-row-reverse' : 'flex-row'} ${className}`.trim();
    // Inner logo content (Image + Optional Text)
    const content = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                src: src,
                alt: alt,
                width: width,
                height: height,
                priority: true,
                className: "object-contain shrink-0"
            }, void 0, false, {
                fileName: "[project]/src/components/ui/logo.tsx",
                lineNumber: 53,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            text && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: `font-semibold text-lg tracking-tight text-foreground ${textClassName}`.trim(),
                children: text
            }, void 0, false, {
                fileName: "[project]/src/components/ui/logo.tsx",
                lineNumber: 62,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/logo.tsx",
        lineNumber: 52,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
    // Render wrapped in Next.js Link if href is specified
    if (href) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
            href: href,
            className: containerClasses,
            "aria-label": text || alt,
            children: content
        }, void 0, false, {
            fileName: "[project]/src/components/ui/logo.tsx",
            lineNumber: 74,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0));
    }
    // Render non-clickable div if href is explicitly set to null/empty
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: containerClasses,
        children: content
    }, void 0, false, {
        fileName: "[project]/src/components/ui/logo.tsx",
        lineNumber: 81,
        columnNumber: 10
    }, ("TURBOPACK compile-time value", void 0));
};
const __TURBOPACK__default__export__ = Logo;
}),
"[project]/src/lib/store.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AtlasProvider",
    ()=>AtlasProvider,
    "useAtlas",
    ()=>useAtlas
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
/**
 * Store do ATLAS: estado de domínio compartilhado pelas telas internas.
 *
 * Implementação de demonstração (sem backend): mantém o estado em memória
 * e persiste em localStorage, mas reproduz as regras de negócio descritas
 * na ERS (ver PROJETO-ATLAS.md), em especial RF_F1 - Atualizar estoque,
 * que é "acionado internamente" por outros casos de uso.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
'use client';
;
;
const STORAGE_KEY = 'atlas-demo-state-v1';
function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function seedState() {
    const produtos = [
        {
            id: 'p1',
            nome: 'Arroz 5kg',
            categoria: 'Alimento',
            unidadeMedida: 'pacote',
            quantidadeEstoque: 42,
            estoqueMinimo: 10,
            dataValidade: '2027-03-01'
        },
        {
            id: 'p2',
            nome: 'Feijão 1kg',
            categoria: 'Alimento',
            unidadeMedida: 'pacote',
            quantidadeEstoque: 18,
            estoqueMinimo: 15,
            dataValidade: '2026-12-15'
        },
        {
            id: 'p3',
            nome: 'Leite em pó',
            categoria: 'Alimento',
            unidadeMedida: 'lata',
            quantidadeEstoque: 6,
            estoqueMinimo: 10,
            dataValidade: '2026-11-05'
        },
        {
            id: 'p4',
            nome: 'Óleo de soja',
            categoria: 'Alimento',
            unidadeMedida: 'litro',
            quantidadeEstoque: 24,
            estoqueMinimo: 8,
            dataValidade: '2027-01-20'
        },
        {
            id: 'p5',
            nome: 'Material escolar (kit)',
            categoria: 'Material',
            unidadeMedida: 'kit',
            quantidadeEstoque: 30,
            estoqueMinimo: 5
        }
    ];
    const doadores = [
        {
            id: 'd1',
            nome: 'Supermercado Boa Compra',
            contato: '(18) 3222-1000',
            anonimo: false
        },
        {
            id: 'd2',
            nome: 'Maria Aparecida',
            contato: '(18) 99999-1234',
            anonimo: false
        },
        {
            id: 'd3',
            nome: 'Doador Anônimo',
            contato: '',
            anonimo: true
        }
    ];
    const caixas = [
        {
            id: 'c1',
            dataAbertura: new Date().toISOString(),
            saldoFisicoAbertura: 150,
            saldoDigitalAbertura: 820,
            status: 'ABERTO',
            movimentacoes: [],
            abertoPor: 'Gerente'
        }
    ];
    const cotacoes = [
        {
            id: 'cot1',
            descricao: 'Reposição mensal de alimentos não perecíveis',
            dataAbertura: new Date().toISOString(),
            status: 'PENDENTE',
            itens: [
                {
                    produtoId: 'p2',
                    quantidadeDesejada: 40
                },
                {
                    produtoId: 'p3',
                    quantidadeDesejada: 20
                }
            ],
            abertaPor: 'Secretário'
        }
    ];
    return {
        produtos,
        movimentacoesEstoque: [],
        doadores,
        doacoesProduto: [],
        doacoesDinheiro: [],
        caixas,
        cotacoes
    };
}
const AtlasContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(null);
function AtlasProvider({ children }) {
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>seedState());
    const [hydrated, setHydrated] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    // Carrega do localStorage no client (evita mismatch de hidratação)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) setState(JSON.parse(raw));
        } catch  {
        // ignora estado corrompido e segue com o seed
        }
        setHydrated(true);
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!hydrated) return;
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch  {
        // armazenamento indisponível (modo privado etc.) — segue só em memória
        }
    }, [
        state,
        hydrated
    ]);
    const caixaAberto = state.caixas.find((c)=>c.status === 'ABERTO');
    function atualizarEstoque(produtoId, tipo, quantidade, origem) {
        setState((prev)=>({
                ...prev,
                produtos: prev.produtos.map((p)=>p.id === produtoId ? {
                        ...p,
                        quantidadeEstoque: p.quantidadeEstoque + (tipo === 'ENTRADA' ? quantidade : -quantidade)
                    } : p),
                movimentacoesEstoque: [
                    {
                        id: uid('mov'),
                        produtoId,
                        tipo,
                        quantidade,
                        data: new Date().toISOString(),
                        origem
                    },
                    ...prev.movimentacoesEstoque
                ]
            }));
    }
    function cadastrarProduto(produto) {
        setState((prev)=>({
                ...prev,
                produtos: [
                    {
                        ...produto,
                        id: uid('p')
                    },
                    ...prev.produtos
                ]
            }));
    }
    function cadastrarDoador(doador) {
        const novo = {
            ...doador,
            id: uid('d')
        };
        setState((prev)=>({
                ...prev,
                doadores: [
                    novo,
                    ...prev.doadores
                ]
            }));
        return novo;
    }
    function registrarDoacaoProduto(doadorId, itens) {
        const doacaoId = uid('doap');
        setState((prev)=>({
                ...prev,
                doacoesProduto: [
                    {
                        id: doacaoId,
                        doadorId,
                        data: new Date().toISOString(),
                        itens: itens.map((i)=>({
                                produtoId: i.produtoId,
                                quantidade: i.quantidade
                            })),
                        registradoPor: 'Funcionário'
                    },
                    ...prev.doacoesProduto
                ]
            }));
        // RF_F1 - Atualizar estoque, acionado pela doação (RF_F3)
        itens.forEach((i)=>atualizarEstoque(i.produtoId, 'ENTRADA', i.quantidade, `Doação de produto (${doacaoId})`));
    }
    function registrarDoacaoDinheiro(doadorId, valor, formaRecebimento) {
        const doacaoId = uid('doad');
        setState((prev)=>({
                ...prev,
                doacoesDinheiro: [
                    {
                        id: doacaoId,
                        doadorId,
                        valor,
                        formaRecebimento,
                        data: new Date().toISOString(),
                        registradoPor: 'Funcionário'
                    },
                    ...prev.doacoesDinheiro
                ]
            }));
        // RF_F6 - Atualizar caixa, acionado pela doação (RF_F11)
        atualizarCaixa('ENTRADA', valor, `Doação em dinheiro (${doacaoId})`);
    }
    function abrirCaixa(saldoFisico, saldoDigital) {
        setState((prev)=>({
                ...prev,
                caixas: [
                    {
                        id: uid('caixa'),
                        dataAbertura: new Date().toISOString(),
                        saldoFisicoAbertura: saldoFisico,
                        saldoDigitalAbertura: saldoDigital,
                        status: 'ABERTO',
                        movimentacoes: [],
                        abertoPor: 'Gerente'
                    },
                    ...prev.caixas
                ]
            }));
    }
    function atualizarCaixa(tipo, valor, origem) {
        setState((prev)=>{
            const aberto = prev.caixas.find((c)=>c.status === 'ABERTO');
            if (!aberto) return prev;
            return {
                ...prev,
                caixas: prev.caixas.map((c)=>c.id === aberto.id ? {
                        ...c,
                        movimentacoes: [
                            {
                                id: uid('movcx'),
                                tipo,
                                valor,
                                origem,
                                data: new Date().toISOString()
                            },
                            ...c.movimentacoes
                        ]
                    } : c)
            };
        });
    }
    function fecharCaixa(saldoFisicoInformado, saldoDigitalInformado) {
        setState((prev)=>{
            const aberto = prev.caixas.find((c)=>c.status === 'ABERTO');
            if (!aberto) return prev;
            return {
                ...prev,
                caixas: prev.caixas.map((c)=>c.id === aberto.id ? {
                        ...c,
                        status: 'FECHADO',
                        dataFechamento: new Date().toISOString(),
                        saldoFisicoFechamento: saldoFisicoInformado,
                        saldoDigitalFechamento: saldoDigitalInformado
                    } : c)
            };
        });
    }
    function abrirCotacao(descricao, itens) {
        setState((prev)=>({
                ...prev,
                cotacoes: [
                    {
                        id: uid('cot'),
                        descricao,
                        dataAbertura: new Date().toISOString(),
                        status: 'PENDENTE',
                        itens,
                        abertaPor: 'Secretário'
                    },
                    ...prev.cotacoes
                ]
            }));
    }
    function avaliarCotacao(cotacaoId, status, justificativa) {
        setState((prev)=>({
                ...prev,
                cotacoes: prev.cotacoes.map((c)=>c.id === cotacaoId ? {
                        ...c,
                        status,
                        justificativa
                    } : c)
            }));
    }
    const value = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>({
            ...state,
            caixaAberto,
            atualizarEstoque,
            cadastrarProduto,
            registrarDoacaoProduto,
            registrarDoacaoDinheiro,
            cadastrarDoador,
            abrirCaixa,
            atualizarCaixa,
            fecharCaixa,
            abrirCotacao,
            avaliarCotacao
        }), // eslint-disable-next-line react-hooks/exhaustive-deps
    [
        state
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AtlasContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/src/lib/store.tsx",
        lineNumber: 316,
        columnNumber: 10
    }, this);
}
function useAtlas() {
    const ctx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(AtlasContext);
    if (!ctx) throw new Error('useAtlas deve ser usado dentro de <AtlasProvider>');
    return ctx;
}
}),
];

//# sourceMappingURL=src_20b4-6n._.js.map