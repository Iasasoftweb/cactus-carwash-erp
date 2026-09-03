import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Check,
  KeyRound,
  Pencil,
  UserPlus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ERP_PERMISSIONS,
} from '@cactus/shared';
import type {
  AdminUserResponse,
  UserBranchAccessMode,
  UserBranchOptionResponse,
  UserRoleSummaryResponse,
  UserStatusValue,
} from '@cactus/shared';
import { api } from '../lib/api';
import { hasPermission } from '../lib/authStorage';
import './styles/UsersAdminPage.css';

const PAGE_SIZE = 10;

export function UsersAdminPage() {
  const navigate = useNavigate();

  const canManage =
    hasPermission(
      ERP_PERMISSIONS.userManage,
    );

  const canResetPassword =
    hasPermission(
      ERP_PERMISSIONS.userPasswordReset,
    );

  const canManageRoles =
    hasPermission(
      ERP_PERMISSIONS.userRoleManage,
    );

  const [users, setUsers] =
    useState<AdminUserResponse[]>([]);

  const [roles, setRoles] =
    useState<UserRoleSummaryResponse[]>([]);

  const [branches, setBranches] =
    useState<UserBranchOptionResponse[]>([]);

  const [selected, setSelected] =
    useState<AdminUserResponse | null>(null);

  const [isUserModalOpen, setIsUserModalOpen] =
    useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] =
    useState(false);

  const [search, setSearch] =
    useState('');

  const [page, setPage] =
    useState(1);

  const [username, setUsername] =
    useState('');

  const [fullName, setFullName] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [createRoleIds, setCreateRoleIds] =
    useState<string[]>([]);

  const [editRoleIds, setEditRoleIds] =
    useState<string[]>([]);

  const [
    editBranchAccessMode,
    setEditBranchAccessMode,
  ] = useState<UserBranchAccessMode>(
    'ASSIGNED',
  );

  const [editBranchIds, setEditBranchIds] =
    useState<string[]>([]);

  const [newPassword, setNewPassword] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [notice, setNotice] =
    useState('');

  const filteredUsers =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return users;
      }

      return users.filter((user) =>
        [
          user.username,
          user.fullName,
          user.email ?? '',
          user.status,
          user.branchAccessMode,
          ...user.branchIds.map(
            (branchId) =>
              branches.find(
                (branch) =>
                  branch.id === branchId,
              )?.name ?? '',
          ),
          ...user.roles.map(
            (role) => role.name,
          ),
        ].some((value) =>
          value
            .toLowerCase()
            .includes(query),
        ),
      );
    }, [branches, users, search]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredUsers.length /
          PAGE_SIZE,
      ),
    );

  const visibleUsers =
    filteredUsers.slice(
      (page - 1) * PAGE_SIZE,
      page * PAGE_SIZE,
    );

  const rolesChanged =
    useMemo(() => {
      if (!selected) {
        return false;
      }

      const currentIds =
        selected.roles
          .map((role) => role.id)
          .sort();

      const nextIds =
        [...editRoleIds].sort();

      return (
        currentIds.length !== nextIds.length ||
        currentIds.some(
          (id, index) =>
            id !== nextIds[index],
        )
      );
    }, [selected, editRoleIds]);

  const branchAccessChanged =
    useMemo(() => {
      if (!selected) {
        return false;
      }

      const currentIds =
        [...selected.branchIds].sort();

      const nextIds =
        editBranchAccessMode === 'ALL'
          ? []
          : [...editBranchIds].sort();

      return (
        selected.branchAccessMode !==
          editBranchAccessMode ||
        currentIds.length !== nextIds.length ||
        currentIds.some(
          (id, index) =>
            id !== nextIds[index],
        )
      );
    }, [
      editBranchAccessMode,
      editBranchIds,
      selected,
    ]);

  async function load(): Promise<void> {
    setLoading(true);
    setError('');

    try {
      const [
        userRows,
        roleRows,
        branchRows,
      ] =
        await Promise.all([
          api.adminUsers(),
          api.adminRoles(),
          api.adminUserBranchOptions(),
        ]);

      setUsers(userRows);
      setRoles(roleRows);
      setBranches(branchRows);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cargar usuarios.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (
      !isUserModalOpen &&
      !isCreateModalOpen
    ) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ): void {
      if (
        event.key === 'Escape' &&
        !saving
      ) {
        setIsUserModalOpen(false);
        setIsCreateModalOpen(false);
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, [isUserModalOpen, isCreateModalOpen, saving]);

  function clearCreateForm(): void {
    setUsername('');
    setFullName('');
    setEmail('');
    setPassword('');
    setCreateRoleIds([]);
  }

  async function createUser(
    event: FormEvent,
  ): Promise<void> {
    event.preventDefault();

    setSaving(true);
    setError('');
    setNotice('');

    try {
      await api.createAdminUser({
        username,
        fullName,
        email:
          email.trim() || undefined,
        password,
        roleIds: createRoleIds,
      });

      clearCreateForm();
      setIsCreateModalOpen(false);
      setNotice('Usuario creado.');
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible crear el usuario.',
      );
    } finally {
      setSaving(false);
    }
  }

  function selectUser(
    user: AdminUserResponse,
  ): void {
    setSelected(user);
    setEditRoleIds(
      user.roles.map(
        (role) => role.id,
      ),
    );
    setEditBranchAccessMode(
      user.branchAccessMode,
    );
    setEditBranchIds(user.branchIds);
    setNewPassword('');
    setNotice('');
    setError('');
    setIsUserModalOpen(true);
  }

  function closeUserModal(): void {
    if (saving) {
      return;
    }

    setIsUserModalOpen(false);
  }

  function closeCreateModal(): void {
    if (saving) {
      return;
    }

    setIsCreateModalOpen(false);
  }

  async function changeStatus(
    status: UserStatusValue,
  ): Promise<void> {
    if (!selected) return;

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const updated =
        await api.updateAdminUserStatus(
          selected.id,
          {
            status,
          },
        );

      setSelected(updated);
      setEditRoleIds(
        updated.roles.map(
          (role) => role.id,
        ),
      );
      setEditBranchAccessMode(
        updated.branchAccessMode,
      );
      setEditBranchIds(
        updated.branchIds,
      );
      setNotice(
        'Estado actualizado.',
      );
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible actualizar el estado.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveRoles(): Promise<void> {
    if (!selected || !rolesChanged) {
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const updated =
        await api.updateAdminUserRoles(
          selected.id,
          {
            roleIds: editRoleIds,
          },
        );

      setSelected(updated);
      setEditRoleIds(
        updated.roles.map(
          (role) => role.id,
        ),
      );
      setEditBranchAccessMode(
        updated.branchAccessMode,
      );
      setEditBranchIds(
        updated.branchIds,
      );
      setNotice(
        'Roles actualizados.',
      );
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible actualizar los roles.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveBranchAccess(): Promise<void> {
    if (
      !selected ||
      !branchAccessChanged
    ) {
      return;
    }

    if (
      editBranchAccessMode === 'ASSIGNED' &&
      editBranchIds.length === 0
    ) {
      setError(
        'Debe seleccionar al menos una sucursal.',
      );
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const updated =
        await api.updateAdminUserBranchAccess(
          selected.id,
          {
            branchAccessMode:
              editBranchAccessMode,
            branchIds:
              editBranchAccessMode === 'ALL'
                ? []
                : editBranchIds,
          },
        );

      setSelected(updated);
      setEditBranchAccessMode(
        updated.branchAccessMode,
      );
      setEditBranchIds(
        updated.branchIds,
      );
      setNotice(
        'Acceso por sucursal actualizado.',
      );
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible actualizar las sucursales.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(): Promise<void> {
    if (
      !selected ||
      newPassword.length < 8
    ) {
      setError(
        'La nueva contraseña debe tener al menos 8 caracteres.',
      );
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      await api.resetAdminUserPassword(
        selected.id,
        {
          password: newPassword,
        },
      );

      setNewPassword('');
      setNotice(
        'Contraseña restablecida.',
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible restablecer la contraseña.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="module-page users-admin-page">
      <header className="module-header">
        <div>
          <span className="brand">CACTUS</span>
          <h1>Usuarios y accesos</h1>
          <p>
            Cuentas, estados de acceso y asignación de roles.
          </p>
        </div>

        <button className="secondary-button"
          type="button"
          onClick={() =>
            navigate('/dashboard')
          }
        >
          Volver al panel
        </button>
      </header>

      {error ? (
        <p className="error-message">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p className="users-admin-page__notice">
          {notice}
        </p>
      ) : null}

      <section className="settings-card">
        <div className="users-admin-page__toolbar">
          <div className="users-admin-page__toolbar-heading">
            <div>
              <p className="eyebrow">
                SEGURIDAD
              </p>
              <h2>Usuarios</h2>
            </div>

            <span className="users-admin-page__count">
              {filteredUsers.length}
              {filteredUsers.length === 1
                ? ' usuario'
                : ' usuarios'}
            </span>
          </div>

          <div className="users-admin-page__toolbar-actions">
            <input
              className="users-admin-page__search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar usuarios..."
            />

            {canManage ? (
              <button className="erp-button-primary"
                type="button"
                onClick={() => {
                  clearCreateForm();
                  setError('');
                  setNotice('');
                  setIsCreateModalOpen(true);
                }}
              >
                <UserPlus size={16} />
                Nueva cuenta
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="operations-empty">
            Cargando usuarios...
          </div>
        ) : (
          <>
            <div className="users-admin-page__table-wrap">
              <table className="users-admin-page__table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Nombre</th>
                    <th>Roles</th>
                    <th>Sucursales</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {visibleUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>
                          {user.username}
                        </strong>
                        <small>
                          {user.email ?? 'Sin email'}
                        </small>
                      </td>

                      <td>
                        {user.fullName}
                      </td>

                      <td>
                        <div className="users-admin-page__roles">
                          {user.roles.length ? (
                            <>
                              {user.roles
                                .slice(0, 2)
                                .map((role) => (
                                  <span key={role.id}>
                                    {role.name}
                                  </span>
                                ))}

                              {user.roles.length > 2 ? (
                                <span
                                  className="users-admin-page__roles-more"
                                  title={user.roles
                                    .slice(2)
                                    .map(
                                      (role) =>
                                        role.name,
                                    )
                                    .join(', ')}
                                >
                                  +{user.roles.length - 2}
                                </span>
                              ) : null}
                            </>
                          ) : (
                            <em>
                              Sin roles
                            </em>
                          )}
                        </div>
                      </td>

                      <td>
                        {user.branchAccessMode ===
                        'ALL' ? (
                          <span className="users-admin-page__status users-admin-page__status--active">
                            Todas
                          </span>
                        ) : (
                          <span>
                            {user.branchIds.length}
                            {user.branchIds.length === 1
                              ? ' asignada'
                              : ' asignadas'}
                          </span>
                        )}
                      </td>

                      <td>
                        <span
                          className={`users-admin-page__status users-admin-page__status--${user.status.toLowerCase()}`}
                        >
                          {user.status === 'ACTIVE'
                            ? 'Activo'
                            : user.status === 'LOCKED'
                              ? 'Bloqueado'
                              : 'Inactivo'}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="users-admin-page__icon-button"
                          title="Administrar usuario"
                          aria-label={`Administrar ${user.username}`}
                          onClick={() =>
                            selectUser(user)
                          }
                        >
                          <Pencil size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="users-admin-page__pagination">
              <button
                type="button"
                className="secondary-button"
                disabled={page <= 1}
                onClick={() =>
                  setPage((current) =>
                    Math.max(
                      1,
                      current - 1,
                    ),
                  )
                }
              >
                Anterior
              </button>

              <span>
                Página {page} de {totalPages}
              </span>

              <button
                type="button"
                className="secondary-button"
                disabled={
                  page >= totalPages
                }
                onClick={() =>
                  setPage((current) =>
                    Math.min(
                      totalPages,
                      current + 1,
                    ),
                  )
                }
              >
                Siguiente
              </button>
            </div>
          </>
        )}
      </section>



      {canManage && isCreateModalOpen ? (
        <div
          className="users-admin-page__modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeCreateModal();
            }
          }}
        >
          <section
            className="users-admin-page__modal users-admin-page__modal--create"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-modal-title"
          >
            <header className="users-admin-page__modal-header">
              <div>
                <p className="eyebrow">
                  NUEVA CUENTA
                </p>

                <h2 id="create-user-modal-title">
                  Crear usuario
                </h2>

                <p className="settings-note">
                  Crea una cuenta y asigna sus roles iniciales.
                </p>
              </div>

              <button
                type="button"
                className="users-admin-page__modal-close"
                aria-label="Cerrar"
                disabled={saving}
                onClick={closeCreateModal}
              >
                ×
              </button>
            </header>

            <form
              className="users-admin-page__modal-form"
              onSubmit={(event) => {
                void createUser(event);
              }}
            >
              <div className="users-admin-page__modal-body">
                <section className="users-admin-page__modal-section">
                  <div className="users-admin-page__create-fields">
                    <label>
                      Usuario
                      <input
                        required
                        value={username}
                        onChange={(event) =>
                          setUsername(
                            event.target.value,
                          )
                        }
                      />
                    </label>

                    <label>
                      Nombre completo
                      <input
                        required
                        value={fullName}
                        onChange={(event) =>
                          setFullName(
                            event.target.value,
                          )
                        }
                      />
                    </label>

                    <label>
                      Email
                      <input
                        type="email"
                        value={email}
                        onChange={(event) =>
                          setEmail(
                            event.target.value,
                          )
                        }
                      />
                    </label>

                    <label>
                      Contraseña temporal
                      <input
                        required
                        type="password"
                        minLength={8}
                        value={password}
                        onChange={(event) =>
                          setPassword(
                            event.target.value,
                          )
                        }
                      />
                    </label>
                  </div>
                </section>

                <section className="users-admin-page__modal-section">
                  <div>
                    <h3>Roles iniciales</h3>
                    <p className="settings-note">
                      Selecciona los permisos base del usuario.
                    </p>
                  </div>

                  <div className="users-admin-page__role-grid">
                    {roles.map((role) => (
                      <label
                        key={role.id}
                        className="users-admin-page__role-option"
                      >
                        <input
                          type="checkbox"
                          checked={
                            createRoleIds.includes(
                              role.id,
                            )
                          }
                          disabled={saving}
                          onChange={(event) =>
                            setCreateRoleIds(
                              event.target.checked
                                ? [
                                    ...createRoleIds,
                                    role.id,
                                  ]
                                : createRoleIds.filter(
                                    (id) =>
                                      id !== role.id,
                                  ),
                            )
                          }
                        />

                        <span
                          className="users-admin-page__role-check"
                          aria-hidden="true"
                        >
                          <Check size={12} />
                        </span>

                        <span className="users-admin-page__role-name">
                          {role.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              </div>

              <footer className="users-admin-page__modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={saving}
                  onClick={closeCreateModal}
                >
                  Cancelar
                </button>

                <button className="erp-button-primary"
                  type="submit"
                  disabled={saving}
                >
                  <UserPlus size={16} />
                  {saving
                    ? 'Creando...'
                    : 'Crear usuario'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}

      {selected && isUserModalOpen ? (
        <div
          className="users-admin-page__modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeUserModal();
            }
          }}
        >
          <section
            className="users-admin-page__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-admin-modal-title"
          >
            <header className="users-admin-page__modal-header">
              <div>
                <p className="eyebrow">
                  ACCESO
                </p>

                <h2 id="user-admin-modal-title">
                  {selected.fullName}
                </h2>

                <p className="settings-note">
                  @{selected.username}
                  {selected.email
                    ? ` · ${selected.email}`
                    : ''}
                </p>
              </div>

              <button
                type="button"
                className="users-admin-page__modal-close"
                aria-label="Cerrar"
                disabled={saving}
                onClick={closeUserModal}
              >
                ×
              </button>
            </header>

            <div className="users-admin-page__modal-body">
              {canManage ? (
                <section className="users-admin-page__modal-section">
                  <div>
                    <h3>Estado de acceso</h3>
                    <p className="settings-note">
                      Controla si el usuario puede acceder al ERP.
                    </p>
                  </div>

                  <div className="users-admin-page__status-actions">
                    <button
                      type="button"
                      className={
                        selected.status === 'ACTIVE'
                          ? ''
                          : 'secondary-button'
                      }
                      disabled={saving}
                      onClick={() => {
                        void changeStatus(
                          'ACTIVE',
                        );
                      }}
                    >
                      Activo
                    </button>

                    <button
                      type="button"
                      className={
                        selected.status === 'INACTIVE'
                          ? ''
                          : 'secondary-button'
                      }
                      disabled={saving}
                      onClick={() => {
                        void changeStatus(
                          'INACTIVE',
                        );
                      }}
                    >
                      Inactivo
                    </button>

                    <button
                      type="button"
                      className={
                        selected.status === 'LOCKED'
                          ? ''
                          : 'secondary-button'
                      }
                      disabled={saving}
                      onClick={() => {
                        void changeStatus(
                          'LOCKED',
                        );
                      }}
                    >
                      Bloqueado
                    </button>
                  </div>
                </section>
              ) : null}

              {canManage ? (
                <section className="users-admin-page__modal-section">
                  <div>
                    <h3>Acceso por sucursal</h3>
                    <p className="settings-note">
                      Define si el usuario puede operar en todas
                      las sucursales o solamente en las seleccionadas.
                    </p>
                  </div>

                  <div className="users-admin-page__status-actions">
                    <button
                      type="button"
                      className={
                        editBranchAccessMode === 'ALL'
                          ? ''
                          : 'secondary-button'
                      }
                      disabled={saving}
                      onClick={() => {
                        setEditBranchAccessMode('ALL');
                        setEditBranchIds([]);
                      }}
                    >
                      Todas
                    </button>

                    <button
                      type="button"
                      className={
                        editBranchAccessMode === 'ASSIGNED'
                          ? ''
                          : 'secondary-button'
                      }
                      disabled={saving}
                      onClick={() =>
                        setEditBranchAccessMode(
                          'ASSIGNED',
                        )
                      }
                    >
                      Seleccionadas
                    </button>
                  </div>

                  {editBranchAccessMode ===
                  'ASSIGNED' ? (
                    <div className="users-admin-page__role-grid">
                      {branches.map((branch) => (
                        <label
                          key={branch.id}
                          className="users-admin-page__role-option"
                          title={
                            branch.active
                              ? branch.name
                              : 'Sucursal inactiva'
                          }
                        >
                          <input
                            type="checkbox"
                            checked={editBranchIds.includes(
                              branch.id,
                            )}
                            disabled={
                              saving ||
                              !branch.active
                            }
                            onChange={(event) =>
                              setEditBranchIds(
                                event.target.checked
                                  ? [
                                      ...editBranchIds,
                                      branch.id,
                                    ]
                                  : editBranchIds.filter(
                                      (id) =>
                                        id !== branch.id,
                                    ),
                              )
                            }
                          />

                          <span
                            className="users-admin-page__role-check"
                            aria-hidden="true"
                          >
                            <Check size={12} />
                          </span>

                          <span className="users-admin-page__role-name">
                            {branch.name}
                            {!branch.active
                              ? ' (inactiva)'
                              : ''}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="settings-note">
                      El usuario tendrá acceso automático a todas
                      las sucursales actuales y futuras de la empresa.
                    </p>
                  )}

                  <button
                    className="erp-button-primary"
                    type="button"
                    disabled={
                      saving ||
                      !branchAccessChanged ||
                      (editBranchAccessMode ===
                        'ASSIGNED' &&
                        editBranchIds.length === 0)
                    }
                    onClick={() => {
                      void saveBranchAccess();
                    }}
                  >
                    {saving
                      ? 'Guardando...'
                      : 'Guardar sucursales'}
                  </button>
                </section>
              ) : null}

              {canManageRoles ? (
                <section className="users-admin-page__modal-section">
                  <div>
                    <h3>Roles</h3>
                    <p className="settings-note">
                      Selecciona los roles asignados a este usuario.
                    </p>
                  </div>

                  <div className="users-admin-page__role-grid">
                    {roles.map((role) => (
                      <label
                        key={role.id}
                        className="users-admin-page__role-option"
                      >
                        <input
                          type="checkbox"
                          checked={
                            editRoleIds.includes(
                              role.id,
                            )
                          }
                          disabled={saving}
                          onChange={(event) =>
                            setEditRoleIds(
                              event.target.checked
                                ? [
                                    ...editRoleIds,
                                    role.id,
                                  ]
                                : editRoleIds.filter(
                                    (id) =>
                                      id !==
                                      role.id,
                                  ),
                            )
                          }
                        />

                        <span className="users-admin-page__role-check" aria-hidden="true">
                      <Check size={12} />
                    </span>

                    <span className="users-admin-page__role-name">
                      {role.name}
                    </span>
                      </label>
                    ))}
                  </div>

                  <button className="erp-button-primary"
                    type="button"
                    disabled={
                      saving ||
                      !rolesChanged
                    }
                    onClick={() => {
                      void saveRoles();
                    }}
                  >
                    {saving
                      ? 'Guardando...'
                      : 'Guardar roles'}
                  </button>
                </section>
              ) : null}

              {canResetPassword ? (
                <section className="users-admin-page__modal-section">
                  <div>
                    <h3>
                      Restablecer contraseña
                    </h3>
                    <p className="settings-note">
                      Define una nueva contraseña temporal de al menos 8 caracteres.
                    </p>
                  </div>

                  <div className="users-admin-page__password-row">
                    <input
                      type="password"
                      minLength={8}
                      value={newPassword}
                      disabled={saving}
                      onChange={(event) =>
                        setNewPassword(
                          event.target.value,
                        )
                      }
                      placeholder="Nueva contraseña"
                    />

                    <button
                      type="button"
                      disabled={
                        saving ||
                        newPassword.length < 8
                      }
                      onClick={() => {
                        void resetPassword();
                      }}
                    >
                      <KeyRound size={17} />
                      Restablecer
                    </button>
                  </div>
                </section>
              ) : null}
            </div>

            <footer className="users-admin-page__modal-footer">
              <button
                type="button"
                className="secondary-button"
                disabled={saving}
                onClick={closeUserModal}
              >
                Cerrar
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}
