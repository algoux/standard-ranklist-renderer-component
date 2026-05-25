<script>
  import Ranklist from '../Ranklist.svelte';

  export let data;
  export let splitOrganization = true;
  export let statusCellPreset = 'minimal';
  export let statusColorAsText = true;
  export let emptyStatusPlaceholder = '.';
  export let userAvatarPlacement = 'organization';
</script>

<Ranklist
  {data}
  {splitOrganization}
  {statusCellPreset}
  {statusColorAsText}
  {emptyStatusPlaceholder}
  {userAvatarPlacement}
>
  <td
    slot="user-cell"
    data-testid="svelte-user-context"
    let:user
    let:hideOrganization
    let:hideAvatar
  >
    {user.id}|{hideOrganization}|{hideAvatar}
  </td>
  <td
    slot="status-cell"
    data-testid="svelte-status-context"
    let:statusCellPreset
    let:statusColorAsText
    let:emptyStatusPlaceholder
  >
    {statusCellPreset}|{statusColorAsText}|{emptyStatusPlaceholder}
  </td>
</Ranklist>
