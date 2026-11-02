-- Día de pago del salario: hasta ese día, Presupuesto y Movimientos muestran el mes anterior.

alter table public.profiles
  add column dia_pago smallint not null default 25 check (dia_pago between 1 and 31);
