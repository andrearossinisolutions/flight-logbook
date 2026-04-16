import type { CSSProperties, HTMLAttributes, ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

type EmojiIconProps = HTMLAttributes<HTMLSpanElement> & {
  size?: number;
};

function BaseIcon({ size = 16, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      {...props}
    >
      {children}
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  const { size = 16, style, ...rest } = props as EmojiIconProps;

  return (
    <span
      aria-hidden="true"
      style={{
        fontSize: size,
        lineHeight: 1,
        display: "inline-block",
        ...(style as CSSProperties | undefined),
      } as CSSProperties}
      {...rest}
    >
      📅
    </span>
  );
}

export function CalendarPlusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 14h3" />
      <path d="M8 18h8" />
    </BaseIcon>
  );
}

export function ClockIcon(props: IconProps) {
  const { size = 16, style, ...rest } = props as EmojiIconProps;

  return (
    <span
      aria-hidden="true"
      style={{
        fontSize: size,
        lineHeight: 1,
        display: "inline-block",
        ...(style as CSSProperties | undefined),
      } as CSSProperties}
      {...rest}
    >
      🕒
    </span>
  );
}

export function AirplaneIcon(props: IconProps) {
  const { size = 16, style, ...rest } = props as EmojiIconProps;

  return (
    <span
      aria-hidden="true"
      style={{
        fontSize: size,
        lineHeight: 1,
        display: "inline-block",
        ...(style as CSSProperties | undefined),
      } as CSSProperties}
      {...rest}
    >
      ✈️
    </span>
  );
}

export function MoneyBillIcon(props: IconProps) {
  const { size = 16, style, ...rest } = props as EmojiIconProps;

  return (
    <span
      aria-hidden="true"
      style={{
        fontSize: size,
        lineHeight: 1,
        display: "inline-block",
        ...(style as CSSProperties | undefined),
      } as CSSProperties}
      {...rest}
    >
      💶
    </span>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </BaseIcon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </BaseIcon>
  );
}

export function CopyArrowIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </BaseIcon>
  );
}
