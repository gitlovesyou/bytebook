// lib/navigation.ts — Navigation tree definition

export interface NavLink {
  label: string
  href: string
  icon?: string
  children?: NavLink[]
}

export interface NavSection {
  key: string
  title: string
  items: NavLink[]
}

export async function getNavigation(): Promise<NavSection[]> {
  return [
    {
      key: 'os',
      title: '💻 Operating Systems',
      items: [
        { label: 'Introduction', href: '/os/introduction', icon: '📖' },
        { label: 'Processes', href: '/os/processes', icon: '⚙️' },
        { label: 'CPU Scheduling', href: '/os/cpu-scheduling', icon: '📊',
          children: [
            { label: 'FCFS', href: '/os/cpu-scheduling#fcfs' },
            { label: 'SJF & SRTF', href: '/os/cpu-scheduling#sjf' },
            { label: 'Round Robin', href: '/os/cpu-scheduling#rr' },
          ]
        },
        { label: 'Memory Management', href: '/os/memory', icon: '🧠' },
        { label: 'Deadlocks', href: '/os/deadlocks', icon: '🔒' },
        { label: 'File Systems', href: '/os/file-systems', icon: '📁' },
      ]
    },
    {
      key: 'dsa',
      title: '📐 DSA Master Sheet',
      items: [
        { label: '📋 All Topics Overview', href: '/dsa', icon: '📋' },
        { label: '⚡ Super 150 Sheet', href: '/dsa/super-150', icon: '⚡' },
        { label: 'Arrays', href: '/dsa/arrays', icon: '[]' },
        { label: '2D Arrays / Matrix', href: '/dsa/2d-arrays', icon: '⬛' },
        { label: 'Strings', href: '/dsa/strings', icon: '📝' },
        { label: 'Binary Search', href: '/dsa/binary-search', icon: '🔍' },
        { label: 'Recursion', href: '/dsa/recursion', icon: '🔄' },
        { label: 'Sorting', href: '/dsa/sorting', icon: '🔀' },
        { label: 'Linked List', href: '/dsa/linked-list', icon: '⛓️' },
        { label: 'Stacks', href: '/dsa/stacks', icon: '📚' },
        { label: 'Queues', href: '/dsa/queues', icon: '🔁' },
        { label: 'Binary Trees', href: '/dsa/binary-trees', icon: '🌳' },
        { label: 'BST', href: '/dsa/bst', icon: '🔍' },
        { label: 'Tries', href: '/dsa/tries', icon: '🌐' },
        { label: 'Hashmaps', href: '/dsa/hashmaps', icon: '#️⃣' },
        { label: 'Heaps / Priority Queues', href: '/dsa/heaps-pq', icon: '⛰️' },
        { label: 'Two Pointers & Sliding Window', href: '/dsa/two-pointers', icon: '↔️' },
        { label: 'Greedy', href: '/dsa/greedy', icon: '💰' },
        { label: 'Graphs', href: '/dsa/graphs', icon: '🕸️' },
        { label: 'Backtracking', href: '/dsa/backtracking', icon: '↩️' },
        { label: 'Dynamic Programming', href: '/dsa/dynamic-programming', icon: '🧩' },
      ]
    },
  ]
}
