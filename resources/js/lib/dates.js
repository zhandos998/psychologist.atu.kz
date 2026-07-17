const APP_TIME_ZONE = 'Asia/Qyzylorda';

export function formatDateTime(value, locale = 'ru') {
    const date = parseDate(value);

    if (!date) {
        return value || '';
    }

    return new Intl.DateTimeFormat(locale === 'kk' ? 'kk-KZ' : 'ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: APP_TIME_ZONE,
    })
        .format(date)
        .replace(',', '');
}

export function toDateTimeInputValue(value) {
    const date = parseDate(value);

    if (!date) {
        return '';
    }

    const parts = new Intl.DateTimeFormat('en-CA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: APP_TIME_ZONE,
    }).formatToParts(date);

    const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

    return `${byType.year}-${byType.month}-${byType.day}T${byType.hour}:${byType.minute}`;
}

function parseDate(value) {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    const normalized = String(value)
        .replace(' ', 'T')
        .replace(/\.(\d{3})\d+(Z|[+-]\d{2}:?\d{2})?$/, '.$1$2');
    const date = new Date(normalized);

    return Number.isNaN(date.getTime()) ? null : date;
}
