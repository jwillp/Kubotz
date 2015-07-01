import com.badlogic.gdx.math.Vector2
import com.brm.GoatEngine.ECS.common.PhysicsComponent
import com.brm.GoatEngine.EventManager.GameEvent
import com.brm.GoatEngine.GoatEngine
import com.brm.GoatEngine.ScriptingEngine.EntityScript
import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.ECS.core.EntityManager;
import com.brm.GoatEngine.EventManager.EntityEvent;
import com.brm.GoatEngine.Input.VirtualButton
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Common.Events.CollisionEvent;


class MovingPlatform extends EntityScript{


    PhysicsComponent phys;
    float numberOfTicks = 0;
    def speed = 20;
    def distance = 5

    /**
     * Called when a script is added to an entity
     */
    @Override
    public void onInit(Entity entity, EntityManager entityManager){
        phys = entity.getComponent(PhysicsComponent.ID) as PhysicsComponent;
    }


    /**
     * Called every frame
     * @param entity the entity to update with the script
     */
    @Override
    public void onUpdate(Entity entity, EntityManager entityManager){
        /*numberOfTicks++
        float vx = Math.sin(numberOfTicks * 0.5f * Math.PI) * speed;
        phys.setPosision(vx, 0.0f);
        Logger.log(vx);*/

    }

    /**
     * Called when the entity this script is attached to presses one or more buttons
     * @param entity the entity this script is attached to
     * @param pressedButtons the buttons that were pressed
     */
    @Override
    public void onInput(Entity entity, ArrayList<VirtualButton> pressedButtons){

    }


    /**
     * Called when a collision occurs between two entities. This will be called as long as
     * two entities touch
     * @param contact
     * @param entity
     */
    @Override
    public void onCollision(CollisionEvent contact, Entity entity){

    }

    /**
     * When an event occurs
     * @param event
     * @param entity
     * @param <T>
     */
    @Override
    public <T extends EntityEvent> void onEvent(T event, Entity entity){

    }


    @Override
    public <T extends GameEvent> void onGlobalEvent(T event){

    }

}