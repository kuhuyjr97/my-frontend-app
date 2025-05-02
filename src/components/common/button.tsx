import { Button as ShadcnButton } from "@/components/ui/button"
import { LucideIcon } from "lucide-react";

interface CustomButtonProps {
  text: string;
  onClick?: () => void;
  icon?: LucideIcon;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  disabled?: boolean;
  className?: string;
}

export function CustomButton({
  text,
  onClick,
  icon: Icon,
  variant = "default",
  disabled = false,
  className = "",
}: CustomButtonProps) {
  return (
    <ShadcnButton
      onClick={onClick}
      variant={variant}
      disabled={disabled}
      className={`flex items-center gap-2 ${className}`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {text}
    </ShadcnButton>
  );
}
