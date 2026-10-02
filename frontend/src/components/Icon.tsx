import deleteIcon from "../assets/icons/icon-delete.svg";
import editIcon from "../assets/icons/icon-edit.svg";
import emptyIcon from "../assets/icons/icon-empty.svg";
import plusIcon from "../assets/icons/icon-plus.svg";
import refreshIcon from "../assets/icons/icon-refresh.svg";
import spinnerIcon from "../assets/icons/icon-spinner.svg";

const ICONS = {
  plus: { src: plusIcon, width: 16, height: 16 },
  edit: { src: editIcon, width: 16, height: 16 },
  delete: { src: deleteIcon, width: 16, height: 16 },
  empty: { src: emptyIcon, width: 48, height: 48 },
  spinner: { src: spinnerIcon, width: 40, height: 40 },
  refresh: { src: refreshIcon, width: 16, height: 16 },
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const icon = ICONS[name];
  const width = size ?? icon.width;
  const height = size ?? icon.height;
  return (
    <img
      className={className}
      src={icon.src}
      width={width}
      height={height}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
