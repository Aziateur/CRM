"use client"

/**
 * CategoryIcon — renders a Lucide icon from a string name.
 * 
 * Icons stored in the DB are now Lucide icon names like "shield", "brain", "target"
 * instead of emoji. This component maps those names to the actual icon components.
 * 
 * Falls back to a default icon if the name isn't found.
 * Also handles legacy emoji values gracefully (renders them as-is).
 */

import {
    // Friction types
    ShieldAlert,
    Brain,
    FileQuestion,
    Clock,
    Crosshair,
    HelpCircle,

    // Root causes
    ScrollText,
    Target,
    BookOpen,
    GraduationCap,
    TrendingUp,
    AlertTriangle,
    Settings,
    Monitor,

    // Sales / Pipeline
    Phone,
    PhoneCall,
    PhoneOff,
    PhoneMissed,
    PhoneIncoming,
    PhoneOutgoing,
    UserCheck,
    UserX,
    UserPlus,
    Users,
    Handshake,
    Calendar,
    CalendarCheck,
    Send,
    Inbox,
    Mail,
    MailOpen,
    MessageSquare,
    MessageCircle,

    // Knowledge / Learning
    Lightbulb,
    Bookmark,
    BookMarked,
    FileText,
    FilePlus,
    Folder,
    FolderOpen,
    Notebook,
    PenTool,
    Layers,

    // Status / Feedback
    CheckCircle,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Info,
    ThumbsUp,
    ThumbsDown,
    Star,
    Heart,
    Flag,
    Flame,
    Zap,

    // Actions / Operations
    Search,
    Filter,
    RefreshCw,
    RotateCcw,
    ArrowRight,
    ArrowUpRight,
    ExternalLink,
    Link,
    Copy,
    Scissors,
    Wrench,
    Hammer,
    Cog,

    // Data / Analytics
    BarChart3,
    LineChart,
    PieChart,
    TrendingDown,
    Activity,
    Gauge,

    // Objects
    Building,
    Building2,
    Store,
    Globe,
    Map,
    MapPin,
    Briefcase,
    CreditCard,
    DollarSign,
    Gift,
    Package,
    ShoppingCart,
    Tag,
    Tags,

    // Tech
    Code,
    Terminal,
    Database,
    Server,
    Wifi,
    WifiOff,
    Cloud,
    CloudOff,
    Shield,
    Lock,
    Unlock,
    Key,

    // Communication
    Megaphone,
    Bell,
    BellRing,
    Volume2,
    VolumeX,
    Mic,
    MicOff,
    Video,
    VideoOff,
    Eye,
    EyeOff,

    // Navigation / Layout
    Home,
    Layout,
    Grid,
    List,
    Menu,
    MoreHorizontal,
    ChevronRight,
    ChevronDown,

    // Time
    Timer,
    Hourglass,
    History,
    AlarmClock,

    // Misc
    Sparkles,
    Rocket,
    Award,
    Trophy,
    Crown,
    Puzzle,
    Fingerprint,
    Palette,
    Music,
    Image,
    Camera,
    Smile,
    Frown,
    Meh,

    // Additional category icons
    Factory,
    Truck,
    HardHat,
    ClipboardList,
    Gem,
    Newspaper,
    PenLine,

    // Default fallback
    CircleDot,

    type LucideIcon,
} from "lucide-react"

// ─── Icon Registry ───

const ICON_MAP: Record<string, LucideIcon> = {
    // Friction types
    "shield-alert": ShieldAlert,
    "brain": Brain,
    "file-question": FileQuestion,
    "clock": Clock,
    "crosshair": Crosshair,
    "help-circle": HelpCircle,

    // Root causes
    "scroll-text": ScrollText,
    "target": Target,
    "book-open": BookOpen,
    "graduation-cap": GraduationCap,
    "trending-up": TrendingUp,
    "alert-triangle": AlertTriangle,
    "settings": Settings,
    "monitor": Monitor,

    // Sales / Pipeline
    "phone": Phone,
    "phone-call": PhoneCall,
    "phone-off": PhoneOff,
    "phone-missed": PhoneMissed,
    "phone-incoming": PhoneIncoming,
    "phone-outgoing": PhoneOutgoing,
    "user-check": UserCheck,
    "user-x": UserX,
    "user-plus": UserPlus,
    "users": Users,
    "handshake": Handshake,
    "calendar": Calendar,
    "calendar-check": CalendarCheck,
    "send": Send,
    "inbox": Inbox,
    "mail": Mail,
    "mail-open": MailOpen,
    "message-square": MessageSquare,
    "message-circle": MessageCircle,

    // Knowledge / Learning
    "lightbulb": Lightbulb,
    "bookmark": Bookmark,
    "book-marked": BookMarked,
    "file-text": FileText,
    "file-plus": FilePlus,
    "folder": Folder,
    "folder-open": FolderOpen,
    "notebook": Notebook,
    "pen-tool": PenTool,
    "layers": Layers,

    // Status / Feedback
    "check-circle": CheckCircle,
    "check-circle-2": CheckCircle2,
    "x-circle": XCircle,
    "alert-circle": AlertCircle,
    "info": Info,
    "thumbs-up": ThumbsUp,
    "thumbs-down": ThumbsDown,
    "star": Star,
    "heart": Heart,
    "flag": Flag,
    "flame": Flame,
    "zap": Zap,

    // Actions
    "search": Search,
    "filter": Filter,
    "refresh-cw": RefreshCw,
    "rotate-ccw": RotateCcw,
    "arrow-right": ArrowRight,
    "arrow-up-right": ArrowUpRight,
    "external-link": ExternalLink,
    "link": Link,
    "copy": Copy,
    "scissors": Scissors,
    "wrench": Wrench,
    "hammer": Hammer,
    "cog": Cog,

    // Data / Analytics
    "bar-chart": BarChart3,
    "bar-chart-3": BarChart3,
    "line-chart": LineChart,
    "pie-chart": PieChart,
    "trending-down": TrendingDown,
    "activity": Activity,
    "gauge": Gauge,

    // Objects
    "building": Building,
    "building-2": Building2,
    "store": Store,
    "globe": Globe,
    "map": Map,
    "map-pin": MapPin,
    "briefcase": Briefcase,
    "credit-card": CreditCard,
    "dollar-sign": DollarSign,
    "gift": Gift,
    "package": Package,
    "shopping-cart": ShoppingCart,
    "tag": Tag,
    "tags": Tags,

    // Tech
    "code": Code,
    "terminal": Terminal,
    "database": Database,
    "server": Server,
    "wifi": Wifi,
    "wifi-off": WifiOff,
    "cloud": Cloud,
    "cloud-off": CloudOff,
    "shield": Shield,
    "lock": Lock,
    "unlock": Unlock,
    "key": Key,

    // Communication
    "megaphone": Megaphone,
    "bell": Bell,
    "bell-ring": BellRing,
    "volume-2": Volume2,
    "volume-x": VolumeX,
    "mic": Mic,
    "mic-off": MicOff,
    "video": Video,
    "video-off": VideoOff,
    "eye": Eye,
    "eye-off": EyeOff,

    // Navigation
    "home": Home,
    "layout": Layout,
    "grid": Grid,
    "list": List,
    "menu": Menu,
    "more-horizontal": MoreHorizontal,
    "chevron-right": ChevronRight,
    "chevron-down": ChevronDown,

    // Time
    "timer": Timer,
    "hourglass": Hourglass,
    "history": History,
    "alarm-clock": AlarmClock,

    // Misc
    "sparkles": Sparkles,
    "rocket": Rocket,
    "award": Award,
    "trophy": Trophy,
    "crown": Crown,
    "puzzle": Puzzle,
    "fingerprint": Fingerprint,
    "palette": Palette,
    "music": Music,
    "image": Image,
    "camera": Camera,
    "smile": Smile,
    "frown": Frown,
    "meh": Meh,

    "circle-dot": CircleDot,

    // Additional category icons
    "factory": Factory,
    "truck": Truck,
    "hard-hat": HardHat,
    "clipboard-list": ClipboardList,
    "gem": Gem,
    "newspaper": Newspaper,
    "pen-line": PenLine,
}

// ─── Public API ───

/** All available icon names for the picker */
export const AVAILABLE_ICONS = Object.keys(ICON_MAP)

/** Curated icon sets for specific category types */
export const ICON_PRESETS: Record<string, string[]> = {
    friction_type: [
        "shield-alert", "brain", "file-question", "clock", "crosshair",
        "help-circle", "alert-triangle", "zap", "flame", "x-circle",
        "thumbs-down", "frown", "wrench", "scroll-text",
    ],
    root_cause_type: [
        "scroll-text", "target", "book-open", "graduation-cap", "trending-up",
        "alert-triangle", "settings", "monitor", "database", "wrench",
        "brain", "lightbulb", "flag", "meh",
    ],
    segment: [
        "building", "building-2", "store", "globe", "briefcase",
        "users", "user-check", "tag", "star", "crown",
        "dollar-sign", "gift", "package", "layers",
    ],
    intel_category: [
        "lightbulb", "bookmark", "file-text", "notebook", "search",
        "eye", "megaphone", "globe", "bar-chart", "activity",
    ],
    pipeline: [
        "phone", "phone-call", "user-check", "handshake", "calendar-check",
        "send", "inbox", "check-circle", "star", "flag",
    ],
    default: [
        "zap", "star", "flag", "bookmark", "tag",
        "check-circle", "alert-circle", "info", "lightbulb", "target",
        "heart", "flame", "sparkles", "rocket", "award",
    ],
}

/** Check if a string is an emoji (legacy data) vs a Lucide icon name */
function isEmoji(str: string): boolean {
    if (!str) return false
    // Icon names are lowercase with hyphens; emoji are unicode characters
    return !/^[a-z0-9-]+$/.test(str)
}

interface CategoryIconProps {
    icon: string
    className?: string
    size?: number
    /** Color to apply (hex or CSS color) */
    color?: string | null
}

/**
 * Renders a Lucide icon from a stored icon name string.
 * Gracefully handles legacy emoji values by rendering them as text.
 */
export function CategoryIcon({ icon, className = "h-4 w-4", size, color }: CategoryIconProps) {
    // Legacy emoji handling
    if (!icon || isEmoji(icon)) {
        return (
            <span
                className={`inline-flex items-center justify-center ${size ? "" : "text-sm"}`}
                style={size ? { fontSize: size, lineHeight: 1 } : undefined}
            >
                {icon || "•"}
            </span>
        )
    }

    const IconComponent = ICON_MAP[icon]
    if (!IconComponent) {
        // Unknown icon name — render as text
        return (
            <span className="inline-flex items-center justify-center text-xs text-muted-foreground">
                {icon}
            </span>
        )
    }

    return (
        <IconComponent
            className={className}
            size={size}
            style={color ? { color } : undefined}
        />
    )
}

// ─── Icon Picker Component ───

interface IconPickerProps {
    value: string
    onChange: (icon: string) => void
    presetKey?: string
    className?: string
}

export function IconPicker({ value, onChange, presetKey, className }: IconPickerProps) {
    const presetIcons = ICON_PRESETS[presetKey ?? "default"] ?? ICON_PRESETS.default
    const allIcons = [...new Set([...presetIcons, ...AVAILABLE_ICONS.slice(0, 60)])]

    return (
        <div className={`space-y-2 ${className ?? ""}`}>
            <div className="grid grid-cols-7 gap-1 max-h-48 overflow-y-auto p-1 border rounded-md bg-muted/20">
                {allIcons.map((iconName) => {
                    const isSelected = value === iconName
                    return (
                        <button
                            key={iconName}
                            type="button"
                            onClick={() => onChange(iconName)}
                            className={`p-2 rounded-md flex items-center justify-center transition-all ${isSelected
                                ? "bg-primary text-primary-foreground ring-2 ring-primary shadow-sm"
                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                }`}
                            title={iconName}
                        >
                            <CategoryIcon icon={iconName} className="h-4 w-4" />
                        </button>
                    )
                })}
            </div>
            <p className="text-[10px] text-muted-foreground">
                Selected: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{value || "none"}</code>
            </p>
        </div>
    )
}
