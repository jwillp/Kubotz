import com.brm.GoatEngine.EventManager.GameEvent
import com.brm.GoatEngine.GoatEngine
import com.brm.GoatEngine.ScriptingEngine.EntityScript
import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.ECS.core.EntityManager;
import com.brm.GoatEngine.EventManager.EntityEvent;
import com.brm.GoatEngine.Input.VirtualButton;
import com.brm.Kubotz.Common.Events.CollisionEvent
import com.brm.Kubotz.Features.Jump.JumpActionEvent
import com.brm.Kubotz.Input.GameButton;

/**
 * Script used to control a character using player input
 */
class KubotzCharacterControllerScript extends EntityScript{


    String entityId;

    /**
     * Called when a script is added to an entity
     */
    @Override
    public void onInit(Entity entity, EntityManager entityManager){
       entityId = entity.getID();
    }


    /**
     * Called every frame
     * @param entity the entity to update with the script
     */
    @Override
    public void onUpdate(Entity entity, EntityManager entityManager){
        //console.log("Yep", "SUCCESS");
    }

    /**
     * Called when the entity this script is attached to presses one or more buttons
     * @param entity the entity this script is attached to
     * @param pressedButtons the buttons that were pressed
     */
    @Override
    public void onInput(Entity entity, ArrayList<VirtualButton> pressedButtons){

        if(pressedButtons.contains(GameButton.DPAD_UP) || pressedButtons.contains(GameButton.BUTTON_Y)){
            GoatEngine.eventManager.fireEvent(new JumpActionEvent(entityId));
        }








    }


    /**
     * Called when a collision occurs between two entities. This will be called as long as
     * two entities touch
     * @param contact
     * @param entity
     */
    @Override
    public void onCollision(CollisionEvent contact, Entity entity){}

    /**
     * When an event occurs
     * @param event
     * @param entity
     * @param <T>
     */
    @Override
    public <T extends EntityEvent> void onEvent(T event, Entity entity){}


    @Override
    public <T extends GameEvent> void onGlobalEvent(T event){}

}