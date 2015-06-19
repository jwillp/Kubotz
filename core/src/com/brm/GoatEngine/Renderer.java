package com.brm.GoatEngine;

import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.brm.GoatEngine.ECS.core.Entity;

/**
 * Used to render entities on screen
 */
public abstract class Renderer{

    private int zIndex = 0;

    /**
     * Updates the current renderer
     * @param dt
     * @param entity
     */
    public abstract void update(float dt, Entity entity);

    /**
     * Renders on screen
     * @param dt
     * @param entity
     * @param sb
     * @param sr
     */
    public abstract void render(float dt, Entity entity, SpriteBatch sb, ShapeRenderer sr);

    public int getzIndex() {
        return zIndex;
    }

    public void setzIndex(int zIndex) {
        this.zIndex = zIndex;
    }
}
