import InputError from '@/Components/InputError';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const roles = [
    ['student', 'Студент'],
    ['psychologist', 'Психолог'],
    ['ddm_staff', 'ДДМ'],
    ['admin', 'Админ'],
];

const questionTypes = [
    ['single_choice', 'Один вариант'],
    ['multiple_choice', 'Несколько вариантов'],
    ['scale', 'Шкала'],
    ['text', 'Текст'],
    ['mood', 'Настроение'],
];

const scoringMethods = [
    ['simple_sum', 'Сумма баллов'],
    ['reverse_questions', 'Обратные вопросы'],
    ['scale_based', 'Шкалы'],
    ['max_match_type', 'Тип по совпадениям'],
    ['trait_matrix_type', 'Тип по матрице шкал'],
    ['custom_ranges', 'Диапазоны'],
    ['no_score', 'Без подсчета'],
];

export default function Form({ testItem, mode }) {
    const { errors, flash } = usePage().props;
    const [data, setData] = useState(() => initialData(testItem));
    const [saving, setSaving] = useState(false);
    const isEdit = mode === 'edit';

    const pageTitle = isEdit ? 'Редактирование теста' : 'Создание теста';
    const configError = useMemo(() => {
        if (!data.scoring_config.trim()) {
            return null;
        }

        try {
            JSON.parse(data.scoring_config);
            return null;
        } catch {
            return 'JSON в настройках подсчета некорректен.';
        }
    }, [data.scoring_config]);

    const submit = (event) => {
        event.preventDefault();

        if (configError) {
            return;
        }

        setSaving(true);
        router.post(
            isEdit
                ? route('admin.tests.update', testItem.id)
                : route('admin.tests.store'),
            isEdit ? { ...data, _method: 'put' } : data,
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => setSaving(false),
            },
        );
    };

    const setField = (field, value) => setData((current) => ({ ...current, [field]: value }));

    const updateQuestion = (index, field, value) => {
        setField(
            'questions',
            data.questions.map((question, itemIndex) =>
                itemIndex === index ? { ...question, [field]: value } : question,
            ),
        );
    };

    const updateOption = (questionIndex, optionIndex, field, value) => {
        setField(
            'questions',
            data.questions.map((question, itemIndex) => {
                if (itemIndex !== questionIndex) {
                    return question;
                }

                return {
                    ...question,
                    options: question.options.map((option, currentOptionIndex) =>
                        currentOptionIndex === optionIndex
                            ? { ...option, [field]: value }
                            : option,
                    ),
                };
            }),
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-[#274f93]">
                        {pageTitle}
                    </h2>
                    <Link
                        href={route('admin.tests.index')}
                        className="text-sm font-medium text-[#355da8] hover:text-[#274f93]"
                    >
                        К списку
                    </Link>
                </div>
            }
        >
            <Head title={pageTitle} />

            <div className="atu-page">
                <form
                    onSubmit={submit}
                    className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8"
                >
                    {flash.status && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                            {flash.status}
                        </div>
                    )}

                    <section className="atu-panel p-6">
                        <h3 className="atu-panel-title">
                            Основные данные
                        </h3>
                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <Field label="Название" error={errors.title}>
                                <input
                                    value={data.title}
                                    onChange={(event) =>
                                        setField('title', event.target.value)
                                    }
                                    className="atu-input w-full"
                                />
                            </Field>
                            <Field label="Тип" error={errors.type}>
                                <select
                                    value={data.type}
                                    onChange={(event) =>
                                        setField('type', event.target.value)
                                    }
                                    className="atu-input w-full"
                                >
                                    <option value="psychology">Психология</option>
                                    <option value="social_survey">
                                        Социальная анкета
                                    </option>
                                    <option value="mood_meter">
                                        Тестомер настроения
                                    </option>
                                </select>
                            </Field>
                            <Field label="Категория" error={errors.category}>
                                <input
                                    value={data.category}
                                    onChange={(event) =>
                                        setField('category', event.target.value)
                                    }
                                    className="atu-input w-full"
                                />
                            </Field>
                            <Field label="Роли доступа" error={errors.access_roles}>
                                <div className="flex flex-wrap gap-3">
                                    {roles.map(([value, label]) => (
                                        <label
                                            key={value}
                                            className="inline-flex items-center gap-2 text-sm text-gray-700"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={data.access_roles.includes(
                                                    value,
                                                )}
                                                onChange={() =>
                                                    setField(
                                                        'access_roles',
                                                        data.access_roles.includes(
                                                            value,
                                                        )
                                                            ? data.access_roles.filter(
                                                                  (role) =>
                                                                      role !== value,
                                                              )
                                                            : [
                                                                  ...data.access_roles,
                                                                  value,
                                                              ],
                                                    )
                                                }
                                                className="rounded border-gray-300 text-[#355da8] focus:ring-[#355da8]"
                                            />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                            </Field>
                            <Field label="Старт" error={errors.start_date}>
                                <input
                                    type="datetime-local"
                                    value={data.start_date}
                                    onChange={(event) =>
                                        setField('start_date', event.target.value)
                                    }
                                    className="atu-input w-full"
                                />
                            </Field>
                            <Field label="Окончание" error={errors.end_date}>
                                <input
                                    type="datetime-local"
                                    value={data.end_date}
                                    onChange={(event) =>
                                        setField('end_date', event.target.value)
                                    }
                                    className="atu-input w-full"
                                />
                            </Field>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-4">
                            <Toggle
                                label="Активен"
                                checked={data.is_active}
                                onChange={(value) => setField('is_active', value)}
                            />
                            <Toggle
                                label="Обязательный"
                                checked={data.is_required}
                                onChange={(value) =>
                                    setField('is_required', value)
                                }
                            />
                        </div>
                        <Field
                            label="Описание"
                            error={errors.description}
                            className="mt-5"
                        >
                            <textarea
                                value={data.description}
                                onChange={(event) =>
                                    setField('description', event.target.value)
                                }
                                rows={4}
                                className="atu-input w-full"
                            />
                        </Field>
                    </section>

                    <section className="atu-panel p-6">
                        <h3 className="atu-panel-title">
                            Подсчет
                        </h3>
                        <div className="mt-5 grid gap-4 md:grid-cols-[260px_1fr]">
                            <Field
                                label="Метод"
                                error={errors.scoring_method}
                            >
                                <select
                                    value={data.scoring_method}
                                    onChange={(event) =>
                                        setField(
                                            'scoring_method',
                                            event.target.value,
                                        )
                                    }
                                    className="atu-input w-full"
                                >
                                    {scoringMethods.map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field
                                label="JSON настройки"
                                error={errors.scoring_config || configError}
                            >
                                <textarea
                                    value={data.scoring_config}
                                    onChange={(event) =>
                                        setField(
                                            'scoring_config',
                                            event.target.value,
                                        )
                                    }
                                    rows={5}
                                    className="atu-input w-full font-mono"
                                />
                            </Field>
                        </div>
                    </section>

                    <section className="atu-panel p-6">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="atu-panel-title">
                                Вопросы
                            </h3>
                            <button
                                type="button"
                                onClick={() =>
                                    setField('questions', [
                                        ...data.questions,
                                        emptyQuestion(data.questions.length + 1),
                                    ])
                                }
                                className="atu-secondary px-3 py-2"
                            >
                                Добавить вопрос
                            </button>
                        </div>

                        <div className="mt-5 space-y-4">
                            {data.questions.map((question, questionIndex) => (
                                <div
                                    key={questionIndex}
                                    className="rounded-md border border-[#dbe5f6] bg-[#f4f7fc] p-4"
                                >
                                    <div className="grid gap-3 md:grid-cols-[80px_1fr_180px_180px_auto]">
                                        <input
                                            type="number"
                                            min="0"
                                            value={question.order}
                                            onChange={(event) =>
                                                updateQuestion(
                                                    questionIndex,
                                                    'order',
                                                    event.target.value,
                                                )
                                            }
                                            className="atu-input"
                                        />
                                        <input
                                            value={question.text}
                                            onChange={(event) =>
                                                updateQuestion(
                                                    questionIndex,
                                                    'text',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Текст вопроса"
                                            className="atu-input"
                                        />
                                        <select
                                            value={question.type}
                                            onChange={(event) =>
                                                updateQuestion(
                                                    questionIndex,
                                                    'type',
                                                    event.target.value,
                                                )
                                            }
                                            className="atu-input"
                                        >
                                            {questionTypes.map(([value, label]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            value={question.scale_name}
                                            onChange={(event) =>
                                                updateQuestion(
                                                    questionIndex,
                                                    'scale_name',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Шкала"
                                            className="atu-input"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setField(
                                                    'questions',
                                                    data.questions.filter(
                                                        (_, index) =>
                                                            index !== questionIndex,
                                                    ),
                                                )
                                            }
                                            className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                                        >
                                            Удалить
                                        </button>
                                    </div>

                                    <div className="mt-3">
                                        <Toggle
                                            label="Обязательный"
                                            checked={question.is_required}
                                            onChange={(value) =>
                                                updateQuestion(
                                                    questionIndex,
                                                    'is_required',
                                                    value,
                                                )
                                            }
                                        />
                                    </div>

                                    {question.type !== 'text' && (
                                        <div className="mt-4 space-y-2">
                                            {question.options.map(
                                                (option, optionIndex) => (
                                                    <div
                                                        key={optionIndex}
                                                        className="grid gap-2 md:grid-cols-[1fr_120px_160px_auto]"
                                                    >
                                                        <input
                                                            value={option.text}
                                                            onChange={(event) =>
                                                                updateOption(
                                                                    questionIndex,
                                                                    optionIndex,
                                                                    'text',
                                                                    event.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Вариант"
                                                            className="atu-input"
                                                        />
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={option.score}
                                                            onChange={(event) =>
                                                                updateOption(
                                                                    questionIndex,
                                                                    optionIndex,
                                                                    'score',
                                                                    event.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Балл"
                                                            className="atu-input"
                                                        />
                                                        <input
                                                            value={option.value}
                                                            onChange={(event) =>
                                                                updateOption(
                                                                    questionIndex,
                                                                    optionIndex,
                                                                    'value',
                                                                    event.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="value"
                                                            className="atu-input"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                updateQuestion(
                                                                    questionIndex,
                                                                    'options',
                                                                    question.options.filter(
                                                                        (_, index) =>
                                                                            index !==
                                                                            optionIndex,
                                                                    ),
                                                                )
                                                            }
                                                            className="atu-secondary px-3 py-2"
                                                        >
                                                            Убрать
                                                        </button>
                                                    </div>
                                                ),
                                            )}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    updateQuestion(
                                                        questionIndex,
                                                        'options',
                                                        [
                                                            ...question.options,
                                                            emptyOption(),
                                                        ],
                                                    )
                                                }
                                                className="atu-secondary px-3 py-2"
                                            >
                                                Добавить вариант
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    <InterpretationsEditor
                        data={data}
                        setField={setField}
                        errors={errors}
                    />

                    <div className="flex justify-end gap-3">
                        {isEdit && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (confirm('Удалить тест?')) {
                                        router.delete(
                                            route(
                                                'admin.tests.destroy',
                                                testItem.id,
                                            ),
                                        );
                                    }
                                }}
                                className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                            >
                                Удалить
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={saving || Boolean(configError)}
                            className="atu-primary px-5 py-2 disabled:opacity-50"
                        >
                            {saving ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}

function InterpretationsEditor({ data, setField, errors }) {
    const updateInterpretation = (index, field, value) => {
        setField(
            'interpretations',
            data.interpretations.map((item, itemIndex) =>
                itemIndex === index ? { ...item, [field]: value } : item,
            ),
        );
    };

    return (
        <section className="atu-panel p-6">
            <div className="flex items-center justify-between gap-3">
                <h3 className="atu-panel-title">
                    Интерпретации
                </h3>
                <button
                    type="button"
                    onClick={() =>
                        setField('interpretations', [
                            ...data.interpretations,
                            emptyInterpretation(),
                        ])
                    }
                    className="atu-secondary px-3 py-2"
                >
                    Добавить
                </button>
            </div>
            <InputError message={errors.interpretations} className="mt-2" />

            <div className="mt-5 space-y-4">
                {data.interpretations.map((item, index) => (
                    <div
                        key={index}
                        className="rounded-md border border-[#dbe5f6] bg-[#f4f7fc] p-4"
                    >
                        <div className="grid gap-3 md:grid-cols-[160px_120px_120px_1fr_auto]">
                            <input
                                value={item.scale_name}
                                onChange={(event) =>
                                    updateInterpretation(
                                        index,
                                        'scale_name',
                                        event.target.value,
                                    )
                                }
                                placeholder="Шкала/тип"
                                className="atu-input"
                            />
                            <input
                                type="number"
                                step="0.01"
                                value={item.min_score}
                                onChange={(event) =>
                                    updateInterpretation(
                                        index,
                                        'min_score',
                                        event.target.value,
                                    )
                                }
                                placeholder="Мин"
                                className="atu-input"
                            />
                            <input
                                type="number"
                                step="0.01"
                                value={item.max_score}
                                onChange={(event) =>
                                    updateInterpretation(
                                        index,
                                        'max_score',
                                        event.target.value,
                                    )
                                }
                                placeholder="Макс"
                                className="atu-input"
                            />
                            <input
                                value={item.title}
                                onChange={(event) =>
                                    updateInterpretation(
                                        index,
                                        'title',
                                        event.target.value,
                                    )
                                }
                                placeholder="Заголовок"
                                className="atu-input"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    setField(
                                        'interpretations',
                                        data.interpretations.filter(
                                            (_, itemIndex) => itemIndex !== index,
                                        ),
                                    )
                                }
                                className="atu-secondary px-3 py-2"
                            >
                                Убрать
                            </button>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <textarea
                                value={item.description}
                                onChange={(event) =>
                                    updateInterpretation(
                                        index,
                                        'description',
                                        event.target.value,
                                    )
                                }
                                placeholder="Описание"
                                rows={3}
                                className="atu-input"
                            />
                            <textarea
                                value={item.recommendation}
                                onChange={(event) =>
                                    updateInterpretation(
                                        index,
                                        'recommendation',
                                        event.target.value,
                                    )
                                }
                                placeholder="Рекомендация"
                                rows={3}
                                className="atu-input"
                            />
                        </div>
                        <div className="mt-3">
                            <Toggle
                                label="Высокий риск"
                                checked={item.is_high_risk}
                                onChange={(value) =>
                                    updateInterpretation(
                                        index,
                                        'is_high_risk',
                                        value,
                                    )
                                }
                            />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function Field({ label, error, children, className = '' }) {
    return (
        <label className={`block ${className}`}>
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <div className="mt-1">{children}</div>
            <InputError message={error} className="mt-2" />
        </label>
    );
}

function Toggle({ label, checked, onChange }) {
    return (
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="rounded border-gray-300 text-[#355da8] focus:ring-[#355da8]"
            />
            {label}
        </label>
    );
}

function initialData(testItem) {
    const rule = testItem?.scoring_rule;

    return {
        title: testItem?.title || '',
        description: testItem?.description || '',
        type: testItem?.type || 'psychology',
        category: testItem?.category || '',
        is_required: Boolean(testItem?.is_required),
        is_active: testItem ? Boolean(testItem.is_active) : true,
        access_roles: testItem?.access_roles || ['student'],
        start_date: toLocalDate(testItem?.start_date),
        end_date: toLocalDate(testItem?.end_date),
        scoring_method: rule?.method || 'simple_sum',
        scoring_config: JSON.stringify(rule?.config || {}, null, 2),
        questions: (testItem?.questions || []).map((question, index) => ({
            id: question.id,
            text: question.text || '',
            type: question.type || 'single_choice',
            order: question.order ?? index + 1,
            is_required: Boolean(question.is_required),
            scale_name: question.scale_name || '',
            options: (question.options || []).map((option) => ({
                id: option.id,
                text: option.text || '',
                score: option.score ?? 0,
                value: option.value || '',
            })),
        })),
        interpretations: (testItem?.interpretations || []).map((item) => ({
            id: item.id,
            scale_name: item.scale_name || '',
            min_score: item.min_score ?? '',
            max_score: item.max_score ?? '',
            title: item.title || '',
            description: item.description || '',
            recommendation: item.recommendation || '',
            is_high_risk: Boolean(item.is_high_risk),
        })),
    };
}

function emptyQuestion(order) {
    return {
        text: '',
        type: 'single_choice',
        order,
        is_required: true,
        scale_name: '',
        options: [emptyOption()],
    };
}

function emptyOption() {
    return {
        text: '',
        score: 0,
        value: '',
    };
}

function emptyInterpretation() {
    return {
        scale_name: '',
        min_score: '',
        max_score: '',
        title: '',
        description: '',
        recommendation: '',
        is_high_risk: false,
    };
}

function toLocalDate(value) {
    if (!value) {
        return '';
    }

    return String(value).slice(0, 16);
}
