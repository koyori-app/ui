import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import vue from '@astrojs/vue';

// Tables can overflow on small screens; make them keyboard-scrollable.
function focusableTables() {
  return (tree) => {
    function visit(node) {
      if (node.tagName === 'table') node.properties.tabIndex = 0;
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}

export default defineConfig({
  markdown: { processor: unified({ rehypePlugins: [focusableTables] }) },
  integrations: [
    starlight({
      title: 'Koyori UI',
      description: 'Koyori の Vue・React 共通 UI コンポーネント',
      locales: { root: { label: '日本語', lang: 'ja' } },
      sidebar: [
        { label: 'はじめに', slug: 'index' },
        {
          label: 'コンポーネント',
          items: [
            { label: 'Accordion', slug: 'components/accordion' },
            { label: 'Avatar・AvatarGroup', slug: 'components/avatar' },
            { label: 'Breadcrumb', slug: 'components/breadcrumb' },
            { label: 'Button', slug: 'components/button' },
            { label: 'ButtonGroup', slug: 'components/button-group' },
            { label: 'Calendar', slug: 'components/calendar' },
            { label: 'Checkbox', slug: 'components/checkbox' },
            { label: 'ContextMenu', slug: 'components/context-menu' },
            { label: 'DataList', slug: 'components/data-list' },
            { label: 'DatePicker', slug: 'components/date-picker' },
            { label: 'Dialog・ConfirmDialog', slug: 'components/dialog' },
            { label: 'Drawer', slug: 'components/drawer' },
            { label: 'Dropdown', slug: 'components/dropdown' },
            { label: 'InlineEdit', slug: 'components/inline-edit' },
            { label: 'Picker', slug: 'components/picker' },
            { label: 'ProgressBar', slug: 'components/progress-bar' },
            { label: 'Sidebar', slug: 'components/sidebar' },
            { label: 'Tag・Badge', slug: 'components/tag-badge' },
            { label: 'Tabs', slug: 'components/tabs' },
            { label: 'Field・Input・Textarea', slug: 'components/field' },
            { label: 'Tooltip', slug: 'components/tooltip' },
          ],
        },
        {
          label: 'ブロック',
          items: [
            { label: '担当者の選択', slug: 'blocks/assignees' },
            { label: 'タスクのプロパティとSSR境界', slug: 'blocks/task-properties' },
            { label: '2 列のダイアログ', slug: 'blocks/two-column-dialog' },
            { label: 'レスポンシブなナビゲーション', slug: 'blocks/responsive-navigation' },
          ],
        },
      ],
      customCss: ['./src/styles/custom.css'],
    }),
    react(),
    vue(),
  ],
});
