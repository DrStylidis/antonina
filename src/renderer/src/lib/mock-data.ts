import type {
  Email,
  CalendarEvent,
  Task,
  Briefing
} from '@/types'

export const mockEmails: Email[] = [
  {
    id: 'e1',
    fromName: 'Sarah Chen',
    fromAddress: 'sarah.chen@ventures.example.com',
    subject: 'Follow-up: Acme Tech seed round next steps',
    preview: 'Hi Alex, Great meeting yesterday. We have discussed internally and would like to proceed with the due diligence process...',
    body: 'Hi Alex,\n\nGreat meeting yesterday. We have discussed internally and would like to proceed with the due diligence process for the seed round. Could you share the following by end of this week:\n\n1. Updated financial projections (18-month runway)\n2. Technical architecture document for ProjectX\n3. Current pipeline and LOI status with AutoMotors and Nordic Auto\n\nWe are targeting a decision by end of February.\n\nBest regards,\nSarah',
    receivedAt: '2026-02-14T08:12:00Z',
    isRead: false,
    classification: 'vip',
    hasAttachments: false,
    vipLabel: 'Investor (Capital Ventures)',
    draft: {
      id: 'd1',
      emailId: 'e1',
      content: 'Hi Sarah,\n\nThank you for the positive feedback. I am glad the meeting went well.\n\nI will have all three documents ready by Thursday. The financial projections are already updated, and I will finalize the technical architecture doc and pipeline summary this week.\n\nLooking forward to the next steps.\n\nBest,\nAlex',
      tone: 'professional',
      confidence: 0.92,
      status: 'pending',
      createdAt: '2026-02-14T08:15:00Z'
    }
  },
  {
    id: 'e2',
    fromName: 'James Miller',
    fromAddress: 'james.miller@automotors.example.com',
    subject: 'RE: ProjectX licensing agreement - revised terms',
    preview: 'Alex, Our legal team has reviewed the proposed terms. We have a few minor adjustments to clause 4.2 regarding...',
    body: 'Alex,\n\nOur legal team has reviewed the proposed terms. We have a few minor adjustments to clause 4.2 regarding IP ownership of derivative works and clause 7.1 on exclusivity periods.\n\nAttached is the redlined version. Could we schedule a call this week to walk through the changes? Most are straightforward.\n\nRegards,\nJames Miller\nHead of Digital Innovation, AutoMotors',
    receivedAt: '2026-02-14T07:45:00Z',
    isRead: false,
    classification: 'vip',
    hasAttachments: true,
    vipLabel: 'Key Client (AutoMotors)',
    draft: {
      id: 'd2',
      emailId: 'e2',
      content: 'Hi James,\n\nThank you for the thorough review. I will go through the redlined version today.\n\nI am available for a call Thursday afternoon or Friday morning. Would either work for your team?\n\nBest,\nAlex',
      tone: 'professional',
      confidence: 0.88,
      status: 'pending',
      createdAt: '2026-02-14T08:00:00Z'
    }
  },
  {
    id: 'e3',
    fromName: 'Dr. Erik Johansen',
    fromAddress: 'erik.johansen@university.example.com',
    subject: 'Paper review request - industry publication submission',
    preview: 'Dear Alex, I hope this email finds you well. I am writing to ask if you would be available to review a submission...',
    body: 'Dear Alex,\n\nI hope this email finds you well. I am writing to ask if you would be available to review a submission to an industry publication on intelligent systems. The paper is on perceived quality assessment using deep learning, which aligns well with your expertise.\n\nThe deadline for reviews is March 15th. Please let me know if you can take this on.\n\nBest regards,\nErik',
    receivedAt: '2026-02-14T06:30:00Z',
    isRead: true,
    classification: 'important',
    hasAttachments: false,
    vipLabel: 'Tech University'
  },
  {
    id: 'e4',
    fromName: 'Sofia Berg',
    fromAddress: 'sofia.berg@nordicauto.example.com',
    subject: 'Pilot program update - Q1 timeline',
    preview: 'Hi Alex, Quick update on our end. The internal approval for the pilot program has been...',
    body: 'Hi Alex,\n\nQuick update on our end. The internal approval for the pilot program has been granted. We are targeting a March start for the initial deployment of ProjectX in our manufacturing facility.\n\nCan we set up a kickoff meeting next week? I will send a calendar invite once you confirm availability.\n\nBest,\nSofia',
    receivedAt: '2026-02-13T16:20:00Z',
    isRead: true,
    classification: 'vip',
    hasAttachments: false,
    vipLabel: 'Nordic Auto',
    draft: {
      id: 'd4',
      emailId: 'e4',
      content: 'Hi Sofia,\n\nExcellent news about the approval! We are ready on our end.\n\nNext week works well. I am most available Tuesday or Wednesday afternoon. I will have our technical lead join the kickoff as well.\n\nBest,\nAlex',
      tone: 'professional',
      confidence: 0.90,
      status: 'pending',
      createdAt: '2026-02-14T08:10:00Z'
    }
  },
  {
    id: 'e5',
    fromName: 'Martin Lindberg',
    fromAddress: 'martin.lindberg@govtech.example.com',
    subject: 'Edge deployment specifications - compute platform',
    preview: 'Hi Alex, Following our discussion about the edge deployment requirements for the GovTech Agency project...',
    body: 'Hi Alex,\n\nFollowing our discussion about the edge deployment requirements for the GovTech Agency project, I have compiled the technical specifications we need:\n\n- Target platform: High-performance edge compute module\n- Inference latency: < 50ms\n- Operating temperature: -40 to +85C\n- Security: Industry-standard compliance\n\nCould you confirm ProjectX can meet these requirements? We need a formal response by February 28th.\n\nBest,\nMartin',
    receivedAt: '2026-02-13T14:00:00Z',
    isRead: true,
    classification: 'vip',
    hasAttachments: true,
    vipLabel: 'GovTech Agency'
  },
  {
    id: 'e6',
    fromName: 'LinkedIn',
    fromAddress: 'notifications-noreply@linkedin.com',
    subject: 'You have 12 new notifications',
    preview: 'Alex, you have 12 new notifications including 3 profile views and 2 connection requests...',
    body: 'Alex, you have 12 new notifications.',
    receivedAt: '2026-02-14T05:00:00Z',
    isRead: false,
    classification: 'noise',
    hasAttachments: false
  },
  {
    id: 'e7',
    fromName: 'AWS',
    fromAddress: 'no-reply@aws.amazon.com',
    subject: 'Your February invoice is available',
    preview: 'Your AWS invoice for the billing period February 1-14 is now available. Total: $342.17...',
    body: 'Your AWS invoice for the billing period February 1-14 is now available.\n\nTotal: $342.17\n\nLog in to your AWS Management Console to view details.',
    receivedAt: '2026-02-14T03:00:00Z',
    isRead: true,
    classification: 'normal',
    hasAttachments: false
  },
  {
    id: 'e8',
    fromName: 'TechCrunch Newsletter',
    fromAddress: 'newsletter@techcrunch.com',
    subject: 'This week in AI: Startups raising big rounds',
    preview: 'The AI ecosystem continues to heat up, with several startups closing significant funding rounds...',
    body: 'The AI ecosystem continues to heat up...',
    receivedAt: '2026-02-14T04:00:00Z',
    isRead: false,
    classification: 'noise',
    hasAttachments: false
  },
  {
    id: 'e9',
    fromName: 'Prof. Maria Nilsson',
    fromAddress: 'maria.nilsson@techuni.example.com',
    subject: 'Course scheduling - Spring semester',
    preview: 'Hi Alex, Could you confirm your availability for the Advanced AI Systems course lectures in April?...',
    body: 'Hi Alex,\n\nCould you confirm your availability for the Advanced AI Systems course lectures in April? We need to finalize the schedule by next Friday.\n\nThe proposed dates are April 7, 14, and 21 (Tuesdays, 10:00-12:00).\n\nBest,\nMaria',
    receivedAt: '2026-02-13T11:00:00Z',
    isRead: true,
    classification: 'important',
    hasAttachments: false,
    vipLabel: 'City University'
  }
]

export const mockEvents: CalendarEvent[] = [
  {
    id: 'ev1',
    title: 'Morning standup — Acme Tech team',
    startTime: '2026-02-14T09:00:00Z',
    endTime: '2026-02-14T09:15:00Z',
    location: 'Google Meet',
    isOnline: true,
    isAllDay: false,
    attendees: ['Alex', 'Elena', 'Marcus', 'Li Wei'],
    prepNote: 'Check sprint progress. Marcus has the compute platform demo update.'
  },
  {
    id: 'ev2',
    title: 'AutoMotors — Licensing discussion',
    startTime: '2026-02-14T10:30:00Z',
    endTime: '2026-02-14T11:30:00Z',
    location: 'Teams',
    isOnline: true,
    isAllDay: false,
    attendees: ['Alex', 'James Miller', 'Sarah Clarke', 'Legal team'],
    prepNote: 'Review redlined contract before the call. Key points: IP clause 4.2, exclusivity clause 7.1.'
  },
  {
    id: 'ev3',
    title: 'Lunch with Capital Ventures',
    startTime: '2026-02-14T12:00:00Z',
    endTime: '2026-02-14T13:00:00Z',
    location: 'Downtown Bistro',
    isOnline: false,
    isAllDay: false,
    attendees: ['Alex', 'Sarah Chen', 'Per Ekman'],
    prepNote: 'Informal follow-up on seed round. Bring the updated deck on your iPad.'
  },
  {
    id: 'ev4',
    title: 'ProjectX — Architecture review',
    startTime: '2026-02-14T14:00:00Z',
    endTime: '2026-02-14T15:30:00Z',
    location: 'Office',
    isOnline: false,
    isAllDay: false,
    attendees: ['Alex', 'Elena', 'Li Wei'],
    prepNote: 'Focus on edge deployment constraints from GovTech Agency. Review compute platform specs.'
  },
  {
    id: 'ev5',
    title: 'Deep work — Paper review',
    startTime: '2026-02-14T16:00:00Z',
    endTime: '2026-02-14T17:30:00Z',
    isOnline: false,
    isAllDay: false,
    attendees: ['Alex'],
    prepNote: 'Block for Erik\'s industry publication paper review. Accept or decline by end of day.'
  }
]

export const mockTasks: Task[] = [
  {
    id: 't1',
    name: 'Prepare due diligence documents for Capital Ventures',
    notes: 'Financial projections, tech architecture, pipeline summary',
    dueDate: '2026-02-18',
    project: 'Fundraising',
    tags: ['urgent', 'investor'],
    completed: false,
    isOverdue: false
  },
  {
    id: 't2',
    name: 'Review AutoMotors licensing agreement redlines',
    notes: 'Focus on clauses 4.2 and 7.1',
    dueDate: '2026-02-14',
    project: 'AutoMotors Deal',
    tags: ['legal', 'client'],
    completed: false,
    isOverdue: false
  },
  {
    id: 't3',
    name: 'Reply to GovTech Agency edge deployment specs',
    notes: 'Confirm ProjectX meets compute platform requirements',
    dueDate: '2026-02-28',
    project: 'GovTech',
    tags: ['technical'],
    completed: false,
    isOverdue: false
  },
  {
    id: 't4',
    name: 'Submit quarterly report to Personal Corp',
    notes: 'Tax reporting for consulting income Q4 2025',
    dueDate: '2026-02-12',
    project: 'Admin',
    tags: ['finance'],
    completed: false,
    isOverdue: true
  },
  {
    id: 't5',
    name: 'Update investor deck with Q4 metrics',
    notes: 'Add new client logos, revenue numbers, and team growth',
    dueDate: '2026-02-14',
    project: 'Fundraising',
    tags: ['investor'],
    completed: false,
    isOverdue: false
  },
  {
    id: 't6',
    name: 'Confirm April lecture dates with City University',
    dueDate: '2026-02-21',
    project: 'Academic',
    tags: ['teaching'],
    completed: false,
    isOverdue: false
  },
  {
    id: 't7',
    name: 'Book travel for Tech Innovation Summit',
    notes: 'March 5-6',
    dueDate: '2026-02-20',
    project: 'Events',
    tags: ['travel'],
    completed: false,
    isOverdue: false
  },
  {
    id: 't8',
    name: 'Review and merge Marcus PR for compute optimization',
    dueDate: '2026-02-13',
    project: 'ProjectX',
    tags: ['engineering'],
    completed: false,
    isOverdue: true
  }
]

export const mockBriefing: Briefing = {
  id: 'b1',
  generatedAt: '2026-02-14T05:30:00Z',
  headline: 'Capital Ventures wants to proceed with due diligence. Prepare documents by Thursday.',
  sections: [
    {
      type: 'priority',
      items: [
        {
          title: 'Capital Ventures moving to due diligence',
          body: 'Sarah Chen confirmed they want to proceed. You need to deliver financial projections, tech architecture doc, and pipeline summary by end of this week. Handle this first because it directly impacts your seed round timeline.',
          urgency: 'urgent',
          source: 'email'
        },
        {
          title: 'AutoMotors licensing terms need review',
          body: 'James Miller sent redlined contract changes. Focus on IP ownership (clause 4.2) and exclusivity (clause 7.1). You have a call with their legal team today at 10:30.',
          urgency: 'urgent',
          source: 'email'
        },
        {
          title: 'Nordic Auto pilot program approved',
          body: 'Sofia confirmed internal approval. March start at manufacturing facility. Propose a kickoff meeting for Tuesday or Wednesday next week.',
          urgency: 'normal',
          source: 'email'
        }
      ]
    },
    {
      type: 'schedule',
      items: [
        {
          title: 'Team standup',
          body: 'Check sprint progress. Marcus has the compute platform demo update.',
          urgency: 'normal',
          time: '09:00',
          source: 'calendar'
        },
        {
          title: 'AutoMotors licensing discussion',
          body: 'Review the redlined contract before this call. Key clauses: 4.2 (IP) and 7.1 (exclusivity).',
          urgency: 'urgent',
          time: '10:30',
          source: 'calendar'
        },
        {
          title: 'Lunch with Capital Ventures',
          body: 'Informal follow-up at Downtown Bistro. Bring the updated deck.',
          urgency: 'normal',
          time: '12:00',
          source: 'calendar'
        },
        {
          title: 'Architecture review',
          body: 'Focus on GovTech Agency edge deployment constraints and compute platform specs.',
          urgency: 'normal',
          time: '14:00',
          source: 'calendar'
        }
      ]
    },
    {
      type: 'tasks',
      items: [
        {
          title: 'Review AutoMotors contract redlines',
          body: 'Due today. Do this before the 10:30 call.',
          urgency: 'urgent',
          source: 'task'
        },
        {
          title: 'Update investor deck with Q4 metrics',
          body: 'Due today. Add new logos and revenue numbers before the Capital Ventures lunch.',
          urgency: 'urgent',
          source: 'task'
        },
        {
          title: 'Quarterly report for Personal Corp (overdue)',
          body: 'Was due Feb 12. Handle this today to avoid tax complications.',
          urgency: 'urgent',
          source: 'task'
        },
        {
          title: 'Review Marcus compute platform PR (overdue)',
          body: 'Was due yesterday. Quick review before standup.',
          urgency: 'normal',
          source: 'task'
        }
      ]
    },
    {
      type: 'low_priority',
      items: [
        {
          title: 'Industry publication paper review request',
          body: 'Erik Johansen asking you to review a paper for an industry publication. Deadline March 15. Decide today.',
          urgency: 'low',
          source: 'email'
        },
        {
          title: 'Confirm April lecture dates',
          body: 'Maria Nilsson needs your availability for April 7, 14, 21. Due next Friday.',
          urgency: 'low',
          source: 'email'
        }
      ]
    }
  ],
  stats: {
    emailsProcessed: 9,
    emailsNeedAttention: 5,
    meetingsToday: 5,
    tasksDue: 4,
    tasksOverdue: 2
  }
}

export const mockBriefingHistory: Briefing[] = [
  mockBriefing,
  {
    id: 'b2',
    generatedAt: '2026-02-13T05:30:00Z',
    headline: 'GovTech Agency sent edge deployment specs. Nordic Auto pilot nearing approval.',
    sections: [],
    stats: {
      emailsProcessed: 12,
      emailsNeedAttention: 3,
      meetingsToday: 4,
      tasksDue: 5,
      tasksOverdue: 1
    }
  },
  {
    id: 'b3',
    generatedAt: '2026-02-12T05:30:00Z',
    headline: 'Quiet day. Focus on the investor deck and GovTech Agency response.',
    sections: [],
    stats: {
      emailsProcessed: 6,
      emailsNeedAttention: 1,
      meetingsToday: 2,
      tasksDue: 3,
      tasksOverdue: 0
    }
  },
  {
    id: 'b4',
    generatedAt: '2026-02-11T05:30:00Z',
    headline: 'AutoMotors sent revised licensing terms. Review before Thursday.',
    sections: [],
    stats: {
      emailsProcessed: 15,
      emailsNeedAttention: 4,
      meetingsToday: 6,
      tasksDue: 2,
      tasksOverdue: 0
    }
  },
  {
    id: 'b5',
    generatedAt: '2026-02-10T05:30:00Z',
    headline: 'Big week ahead. Capital Ventures meeting Wednesday, AutoMotors call Thursday.',
    sections: [],
    stats: {
      emailsProcessed: 8,
      emailsNeedAttention: 2,
      meetingsToday: 3,
      tasksDue: 4,
      tasksOverdue: 1
    }
  }
]
