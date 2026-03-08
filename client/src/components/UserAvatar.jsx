const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";

export default function UserAvatar({
  name = "",
  imageUrl = "",
  sizeClass = "w-8 h-8",
  textClass = "text-xs",
  roundedClass = "rounded-xl",
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name || "User avatar"}
        className={`${sizeClass} ${roundedClass} object-cover border border-slate-200 shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${roundedClass} bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white ${textClass} font-bold shrink-0 shadow-md shadow-indigo-200/30`}
    >
      {getInitials(name)}
    </div>
  );
}
