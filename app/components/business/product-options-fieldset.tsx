import {
	type FieldMetadata,
	type FormMetadata,
	getFieldsetProps,
	getInputProps,
} from "@conform-to/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { ProductFormInput } from "~/lib/validation/business";

type ProductFormFields = {
	[K in keyof ProductFormInput]-?: FieldMetadata<
		ProductFormInput[K],
		ProductFormInput
	>;
};

type GroupField = ReturnType<
	FieldMetadata<
		ProductFormInput["option_groups"],
		ProductFormInput
	>["getFieldList"]
>[number];

type OptionGroupInput = NonNullable<ProductFormInput["option_groups"]>[number];

type ValueField = ReturnType<
	FieldMetadata<
		NonNullable<OptionGroupInput["values"]>,
		ProductFormInput
	>["getFieldList"]
>[number];

export function ProductOptionsFieldset({
	form,
	fields,
}: {
	form: FormMetadata<ProductFormInput>;
	fields: ProductFormFields;
}) {
	const groups = fields.option_groups.getFieldList();

	return (
		<fieldset
			{...getFieldsetProps(fields.option_groups)}
			className="rounded-2xl border border-border/70 bg-background p-4"
		>
			<legend className="px-1 text-sm font-medium">
				Variantes e atributos
			</legend>
			<p className="pb-3 text-xs text-muted-foreground">
				Um grupo com um único valor vira um detalhe fixo (ex.: “Validade: 6
				meses”). Com dois ou mais valores, vira uma opção que o cliente escolhe
				(ex.: “Peso: 300g / 500g / 1kg”). Deixe o preço em branco quando o valor
				não tiver custo adicional.
			</p>

			{groups.length === 0 ? (
				<p className="pb-3 text-xs text-muted-foreground">
					Nenhum grupo adicionado ainda.
				</p>
			) : (
				<ul className="flex flex-col gap-3 pb-3">
					{groups.map((group, index) => (
						<GroupRow
							key={group.key}
							form={form}
							group={group}
							index={index}
							groupsName={fields.option_groups.name}
						/>
					))}
				</ul>
			)}

			<Button
				{...form.insert.getButtonProps({
					name: fields.option_groups.name,
					defaultValue: { name: "", values: [{ value: "", price: "" }] },
				})}
				type="submit"
				variant="outline"
				size="sm"
			>
				+ Adicionar grupo
			</Button>
		</fieldset>
	);
}

function GroupRow({
	form,
	group,
	index,
	groupsName,
}: {
	form: FormMetadata<ProductFormInput>;
	group: GroupField;
	index: number;
	groupsName: string;
}) {
	const groupFields = group.getFieldset();
	const values = groupFields.values.getFieldList();

	return (
		<li className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-3">
			<div className="flex items-end gap-2">
				<label className="flex flex-1 flex-col gap-1 text-xs">
					<span className="font-medium">Nome do grupo *</span>
					<Input
						{...getInputProps(groupFields.name, { type: "text" })}
						placeholder="ex.: Peso"
					/>
					{groupFields.name.errors?.[0] ? (
						<span className="text-destructive">
							{groupFields.name.errors[0]}
						</span>
					) : null}
				</label>
				<Button
					{...form.remove.getButtonProps({ name: groupsName, index })}
					type="submit"
					variant="ghost"
					size="sm"
					className="text-destructive hover:text-destructive"
				>
					Remover grupo
				</Button>
			</div>

			{values.length > 0 ? (
				<ul className="flex flex-col gap-2">
					{values.map((value, valueIndex) => (
						<ValueRow
							key={value.key}
							form={form}
							value={value}
							index={valueIndex}
							valuesName={groupFields.values.name}
						/>
					))}
				</ul>
			) : null}

			<div>
				<Button
					{...form.insert.getButtonProps({
						name: groupFields.values.name,
						defaultValue: { value: "", price: "" },
					})}
					type="submit"
					variant="outline"
					size="sm"
				>
					+ Adicionar valor
				</Button>
			</div>
		</li>
	);
}

function ValueRow({
	form,
	value,
	index,
	valuesName,
}: {
	form: FormMetadata<ProductFormInput>;
	value: ValueField;
	index: number;
	valuesName: string;
}) {
	const valueFields = value.getFieldset();
	return (
		<li className="grid grid-cols-1 gap-2 rounded-lg border border-border/50 bg-background p-2 sm:grid-cols-[1fr_120px_auto] sm:items-end">
			<label className="flex flex-col gap-1 text-xs">
				<span className="font-medium">Valor *</span>
				<Input
					{...getInputProps(valueFields.value, { type: "text" })}
					placeholder="ex.: 300g"
				/>
				{valueFields.value.errors?.[0] ? (
					<span className="text-destructive">
						{valueFields.value.errors[0]}
					</span>
				) : null}
			</label>
			<label className="flex flex-col gap-1 text-xs">
				<span className="font-medium">Preço (R$)</span>
				<Input
					{...getInputProps(valueFields.price, { type: "text" })}
					placeholder="opcional"
					inputMode="decimal"
				/>
				{valueFields.price.errors?.[0] ? (
					<span className="text-destructive">
						{valueFields.price.errors[0]}
					</span>
				) : null}
			</label>
			<Button
				{...form.remove.getButtonProps({ name: valuesName, index })}
				type="submit"
				variant="ghost"
				size="sm"
				className="text-destructive hover:text-destructive"
			>
				Remover
			</Button>
		</li>
	);
}
