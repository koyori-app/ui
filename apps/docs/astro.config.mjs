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
            { label: 'Avatar・AvatarGroup', slug: 'components/avatar' },
            { label: 'Button', slug: 'components/button' },
            { label: 'ButtonGroup', slug: 'components/button-group' },
            { label: 'Dropdown', slug: 'components/dropdown' },
            { label: 'Picker', slug: 'components/picker' },
            { label: 'Field・Input・Textarea', slug: 'components/field' },
          ],
        },
        {
          label: 'ブロック',
          items: [
            { label: '担当者の選択', slug: 'blocks/assignees' },
          ],
        },
      ],
      customCss: ['./src/styles/custom.css'],
    }),
    react(),
    vue(),
  ],
});
