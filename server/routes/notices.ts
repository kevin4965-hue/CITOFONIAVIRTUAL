import crypto from 'node:crypto';
import { Router } from 'express';
import { all, get, run } from '../db.ts';
import { HttpError, body, oneOf, requireRole, requireUser, str, wrap, type Ctx } from '../http.ts';

interface NoticeRow {
  id: string;
  title: string;
  category: 'mantenimiento' | 'urgente' | 'asamblea' | 'informativo';
  message: string;
  target_towers: string;
  author: string;
  created_at: number;
  read: number;
}

const ALL_TOWERS = 'Todas las torres';

const view = (n: NoticeRow) => ({
  id: n.id,
  title: n.title,
  category: n.category,
  message: n.message,
  targetTowers: JSON.parse(n.target_towers) as string[],
  author: n.author,
  createdAt: n.created_at,
  isRead: n.read === 1,
});

export function noticesRouter(ctx: Ctx): Router {
  const r = Router();

  r.get(
    '/notices',
    wrap((req, res) => {
      const user = requireUser(req);
      const rows = all<NoticeRow>(
        ctx.db,
        `SELECT n.*, EXISTS(SELECT 1 FROM notice_reads r WHERE r.notice_id = n.id AND r.user_id = ?) AS read
         FROM notices n WHERE n.complex_id = ? ORDER BY n.created_at DESC LIMIT 200`,
        user.id,
        user.complexId
      ).map(view);

      if (user.role !== 'resident') return res.json(rows);
      // El residente sólo ve los avisos dirigidos a su torre o a todas.
      const unit = get<{ tower: string }>(ctx.db, 'SELECT tower FROM units WHERE id = ?', user.unitId ?? '');
      res.json(rows.filter((n) => n.targetTowers.includes(ALL_TOWERS) || (unit && n.targetTowers.includes(unit.tower))));
    })
  );

  r.post(
    '/notices',
    requireRole('admin'),
    wrap((req, res) => {
      const user = requireUser(req);
      const b = body(req);
      const towers = Array.isArray(b.targetTowers) ? b.targetTowers : [ALL_TOWERS];
      if (towers.length === 0 || towers.length > 20 || towers.some((t) => typeof t !== 'string' || t.length > 40)) {
        throw new HttpError(400, 'targetTowers inválido');
      }
      const id = crypto.randomUUID();
      run(
        ctx.db,
        `INSERT INTO notices (id, complex_id, title, category, message, target_towers, author, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        user.complexId,
        str(b.title, 'title', { max: 150 }),
        oneOf(b.category, 'category', ['mantenimiento', 'urgente', 'asamblea', 'informativo'] as const),
        str(b.message, 'message', { max: 2000 }),
        JSON.stringify(towers),
        user.name,
        Date.now()
      );
      ctx.hub.emit(user.complexId, { type: 'changed', resource: 'notices', id }, { everyone: true });
      res.status(201).json({ id });
    })
  );

  r.post(
    '/notices/:id/read',
    wrap((req, res) => {
      const user = requireUser(req);
      const n = get<{ id: string }>(
        ctx.db,
        'SELECT id FROM notices WHERE id = ? AND complex_id = ?',
        String(req.params.id),
        user.complexId
      );
      if (!n) throw new HttpError(404, 'Aviso no encontrado');
      run(ctx.db, 'INSERT OR IGNORE INTO notice_reads (notice_id, user_id) VALUES (?, ?)', n.id, user.id);
      res.json({ ok: true });
    })
  );

  return r;
}
