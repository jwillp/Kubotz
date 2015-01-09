package com.brm.Kubotz.Systems;


import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.physics.box2d.Box2DDebugRenderer;
import com.badlogic.gdx.physics.box2d.World;
import com.brm.GoatEngine.Viewport;
import com.brm.Kubotz.Config;
import com.brm.GoatEngine.ECS.Entity.EntityManager;


public class RenderingSystem extends com.brm.GoatEngine.ECS.System.System {


    private Viewport viewport;
    private SpriteBatch spriteBatch = new SpriteBatch();
    private ShapeRenderer shapeRenderer = new ShapeRenderer();
    private Box2DDebugRenderer debugRenderer;


    public RenderingSystem(EntityManager em) {
        super(em);
    }

    public void init(){
        this.viewport = new Viewport(20, 14);
        debugRenderer = new Box2DDebugRenderer();



    }

    public void update(){}


    public void render(World world){
        /*if(Config.DEBUG_RENDERING_ENABLED){
            for(Entity e: this.em.getEntities()){
                BoundingBoxRenderer br = new BoundingBoxRenderer(e, getShapeRenderer());
                br.draw(this.viewport.getCamera());
            }
        }*/

        if(Config.DEBUG_RENDERING_ENABLED) {
            this.spriteBatch.begin();
            debugRenderer.render(world, this.viewport.getCamera().combined);
            this.spriteBatch.end();
        }

    }


    /** GETTERS && SETTERS **/
    public Viewport getViewPort() {
        return viewport;
    }

    public SpriteBatch getSpriteBatch() {
        return spriteBatch;
    }

    public void setSpriteBatch(SpriteBatch spriteBatch) {
        this.spriteBatch = spriteBatch;
    }

    public ShapeRenderer getShapeRenderer() {
        return shapeRenderer;
    }

    public void setShapeRenderer(ShapeRenderer shapeRenderer) {
        this.shapeRenderer = shapeRenderer;
    }
}
