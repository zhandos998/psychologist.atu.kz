export default function InputLabel({
    value,
    className = '',
    children,
    ...props
}) {
    return (
        <label
            {...props}
            className={
                `block text-sm font-medium text-[#274f93] ` +
                className
            }
        >
            {value ? value : children}
        </label>
    );
}
