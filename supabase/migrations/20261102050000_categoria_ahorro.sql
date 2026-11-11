-- Categoría predefinida Ahorro (gasto): disponible para todos los usuarios.
insert into public.categories (user_id, nombre, tipo, icono)
select null, 'Ahorro', 'gasto', '🐷'
where not exists (
  select 1 from public.categories
  where user_id is null and nombre = 'Ahorro' and tipo = 'gasto'
);
