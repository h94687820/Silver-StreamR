import { createContext, useContext } from "react";

export type Lang = "en" | "ar";

const translations = {
  en: {
    // Navigation
    nav_home: "Home",
    nav_search: "Search",
    nav_create: "Create",
    nav_notifications: "Notifications",
    nav_profile: "Profile",
    nav_settings: "Settings",
    nav_videos: "Videos",
    nav_saved: "Saved",
    nav_chat: "Messages",
    nav_groups: "Groups",
    // Settings page
    settings_title: "Settings",
    settings_appearance: "Appearance",
    settings_theme: "Theme Mode",
    settings_theme_auto: "Auto",
    settings_theme_light: "Light",
    settings_theme_dark: "Dark",
    settings_accent: "Accent Color",
    settings_language: "Language",
    settings_account: "Account",
    settings_edit_profile: "Edit Profile",
    settings_groups: "Groups",
    settings_privacy: "Privacy",
    settings_private_posts: "Private Posts",
    settings_my_followers: "My Followers",
    settings_blocked_users: "Blocked Users",
    settings_sign_out: "Sign Out",
    settings_delete_account: "Delete Account",
    settings_delete_confirm: "Are you sure you want to delete your account? This action cannot be undone.",
    // Profile page
    profile_edit: "Edit Profile",
    profile_follow: "Follow",
    profile_following: "Following",
    profile_block: "Block",
    profile_unblock: "Unblock",
    profile_posts: "Posts",
    profile_followers: "Followers",
    profile_following_count: "Following",
    profile_tab_posts: "Posts",
    profile_tab_reels: "Reels",
    profile_tab_saved: "Saved",
    profile_no_posts: "No posts yet.",
    profile_reels_soon: "Reels coming soon.",
    profile_not_found: "Profile not found",
    profile_loading: "Loading profile...",
    profile_block_confirm: "Are you sure you want to block this user? They will not be able to see your posts, message you, or mention you.",
    // Notifications page
    notifications_title: "Notifications",
    notifications_mark_read: "Mark all read",
    notifications_empty: "No notifications yet",
    notifications_loading: "Loading...",
    notifications_like: "liked your post",
    notifications_comment: "commented on your post",
    notifications_follow: "started following you",
    notifications_mention: "mentioned you",
    notifications_interacted: "interacted with you",
    // Followers page
    followers_title: "My Followers",
    followers_empty: "No followers yet",
    // Blocked users page
    blocked_title: "Blocked Users",
    blocked_empty: "You haven't blocked anyone",
    blocked_unblock: "Unblock",
    // Landing page
    landing_tagline: "A sleek, premium digital space. Connect, share, and discover in a perfectly polished environment.",
    landing_sign_in: "Sign In",
    // Common
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    error: "Error",
  },
  ar: {
    // Navigation
    nav_home: "الرئيسية",
    nav_search: "بحث",
    nav_create: "نشر",
    nav_notifications: "الإشعارات",
    nav_profile: "الملف الشخصي",
    nav_settings: "الإعدادات",
    nav_videos: "الفيديوهات",
    nav_saved: "المحفوظات",
    nav_chat: "الرسائل",
    nav_groups: "المجموعات",
    // Settings page
    settings_title: "الإعدادات",
    settings_appearance: "المظهر",
    settings_theme: "وضع الثيم",
    settings_theme_auto: "تلقائي",
    settings_theme_light: "فاتح",
    settings_theme_dark: "داكن",
    settings_accent: "لون التمييز",
    settings_language: "اللغة",
    settings_account: "الحساب",
    settings_edit_profile: "تعديل الملف الشخصي",
    settings_groups: "المجموعات",
    settings_privacy: "الخصوصية",
    settings_private_posts: "المنشورات الخاصة",
    settings_my_followers: "متابعوني",
    settings_blocked_users: "المستخدمون المحظورون",
    settings_sign_out: "تسجيل الخروج",
    settings_delete_account: "حذف الحساب",
    settings_delete_confirm: "هل أنت متأكد أنك تريد حذف حسابك؟ هذا الإجراء لا يمكن التراجع عنه.",
    // Profile page
    profile_edit: "تعديل الملف الشخصي",
    profile_follow: "متابعة",
    profile_following: "تتابع",
    profile_block: "حظر",
    profile_unblock: "إلغاء الحظر",
    profile_posts: "منشورات",
    profile_followers: "متابعون",
    profile_following_count: "يتابع",
    profile_tab_posts: "المنشورات",
    profile_tab_reels: "ريلز",
    profile_tab_saved: "المحفوظات",
    profile_no_posts: "لا توجد منشورات بعد.",
    profile_reels_soon: "الريلز قادمة قريباً.",
    profile_not_found: "الملف الشخصي غير موجود",
    profile_loading: "جارٍ تحميل الملف الشخصي...",
    profile_block_confirm: "هل أنت متأكد أنك تريد حظر هذا المستخدم؟ لن يتمكن من رؤية منشوراتك أو مراسلتك أو الإشارة إليك.",
    // Notifications page
    notifications_title: "الإشعارات",
    notifications_mark_read: "تعيين الكل كمقروء",
    notifications_empty: "لا توجد إشعارات بعد",
    notifications_loading: "جارٍ التحميل...",
    notifications_like: "أعجب بمنشورك",
    notifications_comment: "علّق على منشورك",
    notifications_follow: "بدأ بمتابعتك",
    notifications_mention: "أشار إليك",
    notifications_interacted: "تفاعل معك",
    // Followers page
    followers_title: "متابعوني",
    followers_empty: "لا يوجد متابعون بعد",
    // Blocked users page
    blocked_title: "المستخدمون المحظورون",
    blocked_empty: "لم تحظر أحداً بعد",
    blocked_unblock: "إلغاء الحظر",
    // Landing page
    landing_tagline: "مساحة رقمية أنيقة ومتميزة. تواصل، شارك، واكتشف في بيئة متقنة.",
    landing_sign_in: "تسجيل الدخول",
    // Common
    loading: "جارٍ التحميل...",
    save: "حفظ",
    cancel: "إلغاء",
    error: "خطأ",
  },
} as const;

export type TranslationKey = keyof typeof translations["en"];

export const I18nContext = createContext<Lang>("en");

export function useTranslation() {
  const lang = useContext(I18nContext);
  const t = (key: TranslationKey): string => translations[lang][key] ?? translations["en"][key] ?? key;
  return { t, lang };
}
