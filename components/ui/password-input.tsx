import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "./input";
import { cn } from "./utils";

type PasswordInputProps = React.ComponentProps<typeof Input> & {
  toggleLabel?: {
    show: string;
    hide: string;
  };
};

const defaultToggleLabel = {
  show: "Exibir senha",
  hide: "Ocultar senha",
};

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, type, toggleLabel = defaultToggleLabel, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    const toggleVisibility = () => setVisible((prev) => !prev);
    const isVisible = type === "text" ? true : visible;

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={isVisible ? "text" : "password"}
          className={cn("pr-11", className)}
          {...props}
        />
        <button
          type="button"
          onClick={toggleVisibility}
          className="absolute inset-y-0 right-3 flex items-center text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
          aria-label={isVisible ? toggleLabel.hide : toggleLabel.show}
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";
