<script>
  import Ranklist from '../Ranklist.svelte';

  export let data;
  export let splitOrganization = true;
  export let statusCellPreset = 'minimal';
  export let statusColorAsText = true;
  export let emptyStatusPlaceholder = '.';
  export let userAvatarPlacement = 'organization';
  export let languages = ['zh-CN'];
</script>

<Ranklist
  {data}
  {splitOrganization}
  {statusCellPreset}
  {statusColorAsText}
  {emptyStatusPlaceholder}
  {userAvatarPlacement}
  {languages}
>
  <th
    slot="problem-header-cell"
    data-testid="svelte-problem-header-context"
    let:problem
    let:languages
  >
    {problem.alias}|{languages && languages[0]}
  </th>
  <td
    slot="user-cell"
    data-testid="svelte-user-context"
    let:user
    let:hideOrganization
    let:hideAvatar
    let:languages
  >
    {user.id}|{hideOrganization}|{hideAvatar}|{languages && languages[0]}
  </td>
  <td
    slot="status-cell"
    data-testid="svelte-status-context"
    let:statusCellPreset
    let:statusColorAsText
    let:emptyStatusPlaceholder
    let:languages
  >
    {statusCellPreset}|{statusColorAsText}|{emptyStatusPlaceholder}|{languages && languages[0]}
  </td>
</Ranklist>
