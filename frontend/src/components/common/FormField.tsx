import React from 'react';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  inputClassName?: string;
}

const FormField: React.FC<FormFieldProps> = ({ label, inputClassName = 'input placeholder:text-cream-200', id, ...inputProps }) => {
  const fieldId = id || inputProps.name || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div>
      <label htmlFor={fieldId} className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
        {label}
      </label>
      <input id={fieldId} className={inputClassName} {...inputProps} />
    </div>
  );
};

export default FormField;
